import type { QueryClient } from '@tanstack/react-query'
import { ApiError, errorMessage } from '@/api/client'
import type { SupportCategory, SupportCategoryGroup } from '@/api/types'
import { SUPPORT_CATEGORY_ORDER } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'

/** 그룹·개별 케어가 바뀌면 사이드바 그룹 목록, 기관 요약, 명단, 참여 판정을 모두 새로 받습니다. */
export function invalidateSupport(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.groups }),
    queryClient.invalidateQueries({ queryKey: qk.groupSummary }),
    queryClient.invalidateQueries({ queryKey: ['care-persons'] }),
    queryClient.invalidateQueries({ queryKey: ['programs'] }),
  ])
}

/** 지원 항목을 분류 순서대로 묶습니다. */
export function groupByCategory<T extends { category: SupportCategory | null }>(items: T[]) {
  const map = new Map<SupportCategory, T[]>()
  for (const item of items) {
    const category = item.category ?? 'ETC'
    map.set(category, [...(map.get(category) ?? []), item])
  }
  return SUPPORT_CATEGORY_ORDER.filter((c) => map.has(c)).map((category) => ({ category, items: map.get(category)! }))
}

export function sortCategoryGroups(groups: SupportCategoryGroup[]) {
  return [...groups].sort(
    (a, b) => SUPPORT_CATEGORY_ORDER.indexOf(a.category) - SUPPORT_CATEGORY_ORDER.indexOf(b.category),
  )
}

export function mutationErrorMessage(error: unknown, forbidden: string) {
  if (error instanceof ApiError && error.status === 403) return forbidden
  return errorMessage(error)
}
