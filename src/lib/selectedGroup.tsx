import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { groupApi } from '@/api/endpoints'
import type { Group } from '@/api/types'
import { qk } from './queryKeys'

/**
 * 여러 화면(참여 가능 프로그램, 상세, 신청 준비)이 함께 쓰는 "지금 고른 참여 그룹".
 * 고른 그룹은 브라우저에 기억해 둡니다.
 */
interface SelectedGroupValue {
  groups: Group[]
  isLoading: boolean
  selectedGroup: Group | null
  selectGroup: (groupId: number) => void
}

const KEY = 'nubi.selectedGroupId'
const Ctx = createContext<SelectedGroupValue | null>(null)

function readStored(): number | null {
  try {
    const v = localStorage.getItem(KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

export function SelectedGroupProvider({ children }: { children: ReactNode }) {
  const { data: groups = [], isLoading } = useQuery({ queryKey: qk.groups, queryFn: groupApi.list })
  const [groupId, setGroupId] = useState<number | null>(readStored)

  useEffect(() => {
    if (groups.length && !groups.some((g) => g.id === groupId)) setGroupId(groups[0].id)
  }, [groups, groupId])

  const value = useMemo<SelectedGroupValue>(
    () => ({
      groups,
      isLoading,
      selectedGroup: groups.find((g) => g.id === groupId) ?? null,
      selectGroup: (id) => {
        setGroupId(id)
        try {
          localStorage.setItem(KEY, String(id))
        } catch {
          /* noop */
        }
      },
    }),
    [groups, isLoading, groupId],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSelectedGroup() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSelectedGroup은 SelectedGroupProvider 안에서 써야 합니다.')
  return ctx
}
