// 화면 10 "알림 · 벨을 눌렀을 때" — 사이드바 벨 옆에 뜨는 알림 창 + 실시간 알림 토스트
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { Notification, NotificationType } from '@/api/types'
import { useToast } from '@/components/ui'
import { qk } from '@/lib/queryKeys'
import { cn, timeAgo } from '@/lib/format'
import { useNotificationStream } from './useNotificationStream'
import iconLiveDot from '@/assets/icons/notification-live-dot.svg'
import iconUnreadDot from '@/assets/icons/notification-unread-dot.svg'
import iconNewApplication from '@/assets/icons/notification-new-application.svg'
import iconDecided from '@/assets/icons/notification-decided.svg'
import iconCare from '@/assets/icons/notification-care.svg'
import iconDeadline from '@/assets/icons/notification-deadline.svg'
import iconProgram from '@/assets/icons/notification-program.svg'
import iconToastBell from '@/assets/icons/notification-toast-bell.svg'

type Tab = 'ALL' | 'APPLICATION' | 'SUBMISSION' | 'PROGRAM'

const TABS: { value: Tab; label: string; types?: NotificationType[] }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'APPLICATION', label: '신청', types: ['NEW_APPLICATION', 'NEW_REVIEW'] },
  { value: 'SUBMISSION', label: '접수', types: ['APPLICATION_DECIDED', 'DEADLINE'] },
  { value: 'PROGRAM', label: '프로그램', types: ['NEW_PROGRAM', 'CARE_CHANGED'] },
]

const TYPE_META: Record<NotificationType, { label: string; icon: string; tone: 'brand' | 'amber' }> = {
  NEW_APPLICATION: { label: '새 신청', icon: iconNewApplication, tone: 'brand' },
  APPLICATION_DECIDED: { label: '접수 확인', icon: iconDecided, tone: 'brand' },
  CARE_CHANGED: { label: '확인 필요', icon: iconCare, tone: 'amber' },
  DEADLINE: { label: '마감 임박', icon: iconDeadline, tone: 'amber' },
  NEW_PROGRAM: { label: '새 프로그램', icon: iconProgram, tone: 'brand' },
  NEW_REVIEW: { label: '새 후기', icon: iconProgram, tone: 'brand' },
}

const PREVIEW_COUNT = 5

/** 알림이 가리키는 화면 주소. 신청 알림은 주최 쪽 정보(행사 id)가 없어 신청 현황으로 보냅니다. */
function targetPath(n: Notification): string | null {
  if (n.targetType === 'APPLICATION') return '/app/applications'
  if (n.targetType === 'PROGRAM' && n.targetId != null) return `/app/programs/${n.targetId}`
  return null
}

function linkLabel(n: Notification): string | null {
  if (n.targetType === 'APPLICATION') return '신청 보기'
  if (n.targetType === 'PROGRAM') return '프로그램 보기'
  return null
}

/** 알림을 읽음으로 바꾸고 가리키는 화면으로 이동합니다. */
function useOpenNotification() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const read = useMutation({
    mutationFn: (id: number) => notificationApi.read(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.notifications })
      queryClient.invalidateQueries({ queryKey: qk.unreadCount })
    },
  })
  return (n: Notification) => {
    if (!n.read) read.mutate(n.notificationId)
    const path = targetPath(n)
    if (path) navigate(path)
  }
}

/**
 * 실시간 알림 구독만 하는 컴포넌트(아무것도 그리지 않음).
 * 새 알림이 오면 화면 아래 검은 토스트("보기")를 띄웁니다.
 */
export function NotificationStream({ onConnectedChange }: { onConnectedChange?: (connected: boolean) => void }) {
  const toast = useToast()
  const open = useOpenNotification()
  const { connected } = useNotificationStream((n) => {
    toast.show(
      <span className="flex items-center gap-3">
        <img src={iconToastBell} alt="" className="size-[17px] shrink-0" />
        {n.title}
      </span>,
      { action: targetPath(n) ? { label: '보기', onClick: () => open(n) } : undefined, duration: 6000 },
    )
  })
  useEffect(() => {
    onConnectedChange?.(connected)
  }, [connected, onConnectedChange])
  return null
}

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [connected, setConnected] = useState(false)
  return (
    <>
      <NotificationStream onConnectedChange={setConnected} />
      {open && <Panel onClose={onClose} connected={connected} />}
    </>
  )
}

function Panel({ onClose, connected }: { onClose: () => void; connected: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const queryClient = useQueryClient()
  const openNotification = useOpenNotification()
  const [tab, setTab] = useState<Tab>('ALL')
  const [expanded, setExpanded] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...qk.notifications, { size: 50 }],
    queryFn: () => notificationApi.list({ size: 50 }),
  })

  const readAll = useMutation({
    mutationFn: notificationApi.readAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.notifications })
      queryClient.invalidateQueries({ queryKey: qk.unreadCount })
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  // 바깥을 누르거나 ESC를 누르면 닫습니다. 벨 버튼은 Sidebar가 직접 열고 닫으니 제외합니다.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const panel = ref.current
      const target = e.target as Node
      if (!panel || panel.contains(target)) return
      const bell = panel.parentElement?.querySelector('button[aria-label^="알림"]')
      if (bell?.contains(target)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const types = TABS.find((t) => t.value === tab)?.types
  const items = (data?.content ?? []).filter((n) => !types || types.includes(n.type))
  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT)
  const hasUnread = (data?.content ?? []).some((n) => !n.read)

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="알림"
      className="absolute top-10 left-[236px] z-40 flex w-[400px] flex-col overflow-hidden rounded-2xl border border-gray-200 glass-surface shadow-[0_12px_32px_rgba(17,24,39,0.12)]"
    >
      <div className="flex items-center gap-2 pt-4 pr-4 pb-2 pl-5">
        <p className="text-[16px] font-bold text-gray-900">알림</p>
        <span
          className={cn(
            'flex h-[22px] items-center gap-[5px] rounded-[10px] px-2 text-[11.5px] font-medium',
            connected ? 'bg-brand-soft text-brand' : 'bg-gray-100 text-gray-400',
          )}
          title={connected ? '새 알림을 바로 받고 있어요' : '실시간 연결을 다시 시도하고 있어요'}
        >
          <img src={iconLiveDot} alt="" className={cn('size-1.5', !connected && 'grayscale opacity-50')} />
          실시간
        </span>
        <div className="flex-1" />
        <button
          className="text-[12.5px] font-medium text-gray-500 hover:text-gray-900 disabled:text-gray-300"
          disabled={!hasUnread || readAll.isPending}
          onClick={() => readAll.mutate()}
        >
          모두 읽음
        </button>
      </div>

      <div className="flex gap-1 px-4 pb-2.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTab(t.value)
              setExpanded(false)
            }}
            className={cn(
              'h-[30px] rounded-[15px] px-3 text-[12.5px] font-medium',
              tab === t.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={cn('flex flex-col', expanded && 'max-h-[560px] overflow-y-auto')}>
        {isLoading ? (
          <p className="border-t border-gray-100 px-5 py-8 text-center text-[13px] text-gray-500">불러오는 중이에요</p>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 border-t border-gray-100 px-5 py-8 text-center">
            <p className="text-[13px] text-gray-500">{errorMessage(error)}</p>
            <button className="text-[12.5px] font-medium text-brand" onClick={() => refetch()}>
              다시 시도
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="border-t border-gray-100 px-5 py-8 text-center text-[13px] text-gray-500">새 알림이 없어요</p>
        ) : (
          visible.map((n) => (
            <NotificationItem
              key={n.notificationId}
              n={n}
              onClick={() => {
                openNotification(n)
                if (targetPath(n)) onClose()
              }}
            />
          ))
        )}
      </div>

      {!expanded && items.length > PREVIEW_COUNT && (
        <button
          className="border-t border-gray-100 pt-3 pb-3.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
          onClick={() => setExpanded(true)}
        >
          지난 알림 모두 보기
        </button>
      )}
    </div>
  )
}

function NotificationItem({ n, onClick }: { n: Notification; onClick: () => void }) {
  const meta = TYPE_META[n.type]
  const link = linkLabel(n)
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 border-t border-gray-100 px-5 py-3.5 text-left',
        n.read ? 'bg-white hover:bg-gray-50' : 'bg-brand-soft hover:brightness-[0.97]',
      )}
    >
      <span className={cn('flex size-[34px] shrink-0 items-center justify-center rounded-[10px]', n.read ? 'bg-gray-50' : 'bg-white')}>
        <img src={meta.icon} alt="" className={cn('size-[17px]', n.read && 'grayscale opacity-70')} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex w-full items-center gap-1.5">
          <span
            className={cn(
              'text-xs font-medium',
              n.read ? 'text-gray-500' : meta.tone === 'amber' ? 'text-amber-500' : 'text-brand',
            )}
          >
            {meta.label}
          </span>
          <span className="flex-1" />
          <span className="text-[11.5px] text-gray-400">{timeAgo(n.createdAt)}</span>
          {!n.read && <img src={iconUnreadDot} alt="안 읽음" className="size-[7px]" />}
        </span>
        <span className="text-[13.5px] font-medium text-gray-900">{n.title}</span>
        {n.body && <span className="text-[12.5px] text-gray-500">{n.body}</span>}
        {link && !n.read && <span className="text-[12.5px] font-medium text-brand">{link}</span>}
      </span>
    </button>
  )
}
