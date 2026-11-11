import type { ApplyMethod } from '@/api/types'
import { APPLY_METHOD_LABEL } from '@/lib/labels'
import { parseDate } from '@/lib/format'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n: number) => String(n).padStart(2, '0')

/** 11.08 (토) 15:00 — 자정이면 시간을 뺍니다. */
export function rowDate(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return '-'
  const date = `${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${WEEKDAYS[d.getDay()]})`
  if (d.getHours() === 0 && d.getMinutes() === 0) return date
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "8명 + 동반 4명", 동반이 없으면 "8명" */
export function peopleText(participantCount: number, companionCount: number): string {
  return companionCount > 0 ? `${participantCount}명 + 동반 ${companionCount}명` : `${participantCount}명`
}

/** 신청 현황 칩 이름: DIRECT는 "바로 신청" */
export function applyMethodChipLabel(method: ApplyMethod): string {
  return method === 'DIRECT' ? '바로 신청' : APPLY_METHOD_LABEL[method]
}
