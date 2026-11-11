// 행사 상세(화면 12·13·14·16) 공통 훅·도우미
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { eventApi, programApi } from '@/api/endpoints'
import type { ApplicationStatus, EventApplicationList, EventNeeds, PrepStatus, SupportSnapshot } from '@/api/types'
import { qk } from '@/lib/queryKeys'
import { parseDate, timeAgo } from '@/lib/format'

export const WHEELCHAIR_CODES = ['WHEELCHAIR', 'POWER_WHEELCHAIR']

/** 주소의 :eventId 를 숫자로 */
export function useEventId(): number {
  const { eventId } = useParams()
  return Number(eventId)
}

/** 헤더 탭 숫자와 화면 12 위쪽 카드에 쓰는 기본(전체·첫 페이지) 신청 목록 */
export const DEFAULT_LIST_PARAMS = { page: 0, size: 20 } as const

export function useApplicationList(eventId: number, status?: ApplicationStatus, page = 0) {
  const params = status ? { status: [status], page, size: DEFAULT_LIST_PARAMS.size } : { ...DEFAULT_LIST_PARAMS, page }
  return useQuery({
    queryKey: qk.eventApplications(eventId, params),
    queryFn: () => eventApi.applications(eventId, params),
    enabled: Number.isFinite(eventId),
    placeholderData: (prev) => prev,
  })
}

export function useEventNeeds(eventId: number) {
  return useQuery({
    queryKey: qk.eventNeeds(eventId),
    queryFn: () => eventApi.needs(eventId),
    enabled: Number.isFinite(eventId),
  })
}

/** 전체 신청 건수 (상태별 숫자 합) */
export function totalApplications(list: EventApplicationList | undefined): number | null {
  if (!list) return null
  return Object.values(list.statusCounts).reduce<number>((sum, n) => sum + (n ?? 0), 0)
}

/** 휠체어(수동+전동) 인원 합 */
export function wheelchairCount(needs: EventNeeds | undefined): number | null {
  if (!needs) return null
  return needs.items.filter((item) => WHEELCHAIR_CODES.includes(item.code)).reduce((sum, item) => sum + item.totalQuantity, 0)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 11.21 (토) 13:00 */
export function formatShortDateTime(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return '-'
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${weekday}) ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 방금, 10분 전, 어제, 11.01 */
export function submittedText(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return '-'
  if (Date.now() - d.getTime() < 172_800_000) return timeAgo(value)
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

/** 표·패널의 지원 칩 문구: "휠체어 2" */
export function supportChipText(s: Pick<SupportSnapshot, 'label' | 'quantity'>): string {
  return s.quantity ? `${s.label} ${s.quantity}` : s.label
}

export function useEventProgram(eventId: number) {
  return useQuery({
    queryKey: qk.program(eventId),
    queryFn: () => programApi.detail(eventId),
    enabled: Number.isFinite(eventId),
  })
}

export const PREP_ORDER: PrepStatus[] = ['PENDING', 'READY', 'CHECK']

export interface StatItem {
  label: string
  value: string
  highlight?: boolean
}

const n = (v: number | null | undefined, unit: string) => (v == null ? '-' : `${v}${unit}`)

/** 화면 12·14 위쪽 카드 다섯 개 */
export function applicationStatItems(list: EventApplicationList | EventNeeds | undefined, wheelchair: number | null): StatItem[] {
  const people = list ? list.participantCount + list.companionCount : null
  return [
    {
      label: '신청 인원',
      value: list ? (list.capacity != null ? `${people} / ${list.capacity}명` : `${people}명`) : '-',
    },
    { label: '이용자', value: n(list?.participantCount, '명') },
    { label: '동반 인력', value: n(list?.companionCount, '명') },
    { label: '휠체어', value: n(wheelchair, '명') },
    { label: '새 신청', value: n(list?.newApplicationCount, '건'), highlight: true },
  ]
}
