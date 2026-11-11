import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '@/api/client'
import type { Notification } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { tokenStorage } from '@/auth/tokenStorage'
import { qk } from '@/lib/queryKeys'

const MIN_RETRY = 3_000
const MAX_RETRY = 30_000

/**
 * 실시간 알림(SSE) 구독. 새 알림이 오면 알림 목록·안 읽은 수를 다시 불러오고 onNotification을 부릅니다.
 * 연결이 끊기면(서버는 30분마다 끊음) 점점 길게 기다렸다가 다시 연결합니다.
 * 브라우저 EventSource는 헤더를 못 붙여서 토큰을 ?token= 으로 보냅니다.
 */
export function useNotificationStream(onNotification?: (n: Notification) => void) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const handler = useRef(onNotification)
  useEffect(() => {
    handler.current = onNotification
  }, [onNotification])

  useEffect(() => {
    if (!isAuthenticated || typeof EventSource === 'undefined') return
    let source: EventSource | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let delay = MIN_RETRY
    let stopped = false

    const connect = () => {
      // 재연결 때마다 저장소에서 읽어야 axios가 재발급한 새 토큰을 씁니다.
      const token = tokenStorage.getAccessToken()
      if (!token || stopped) return
      source = new EventSource(`${API_BASE_URL}/api/v1/notifications/stream?token=${encodeURIComponent(token)}`)
      source.onopen = () => {
        delay = MIN_RETRY
        setConnected(true)
      }
      source.addEventListener('notification', (e) => {
        queryClient.invalidateQueries({ queryKey: qk.notifications })
        queryClient.invalidateQueries({ queryKey: qk.unreadCount })
        try {
          handler.current?.(JSON.parse((e as MessageEvent<string>).data) as Notification)
        } catch {
          /* 모양이 다른 이벤트는 무시 */
        }
      })
      source.onerror = () => {
        source?.close()
        source = null
        setConnected(false)
        if (stopped) return
        // 토큰이 만료됐을 수 있으니 일반 API를 한 번 불러 axios가 토큰을 재발급하게 합니다.
        queryClient.invalidateQueries({ queryKey: qk.unreadCount })
        timer = setTimeout(connect, delay)
        delay = Math.min(delay * 2, MAX_RETRY)
      }
    }

    connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      source?.close()
      setConnected(false)
    }
  }, [isAuthenticated, queryClient])

  return { connected }
}
