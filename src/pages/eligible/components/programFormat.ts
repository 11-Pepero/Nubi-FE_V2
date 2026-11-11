// 프로그램 카드·목록·상세에서 같이 쓰는 표시 도우미 (03, 04, 09).
import { dDay, parseDate, toYearMonth } from '@/lib/format'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n: number) => String(n).padStart(2, '0')

/** 11.08 (토) 15:00 */
export function cardDateTime(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return '-'
  const date = `${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${WEEKDAYS[d.getDay()]})`
  // 원문에 시각이 없던 수집 공고(0시)는 날짜만
  return d.getHours() === 0 && d.getMinutes() === 0 ? date : `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 11.08 (토) */
export function cardDate(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return '-'
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${WEEKDAYS[d.getDay()]})`
}

/** 11.10 */
export function monthDay(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return '-'
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

/** 마감일 기준 D-day. 마감일이 없으면 상시. */
export function deadlineLabel(deadlineAt: string | null | undefined): string {
  return dDay(deadlineAt) ?? '상시'
}

/** 마감이 3일 안으로 남았는지 (D-day 글자를 파랗게). */
export function isDeadlineSoon(deadlineAt: string | null | undefined): boolean {
  const d = parseDate(deadlineAt)
  if (!d) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  return diff >= 0 && diff <= 3
}

/** 월 드롭다운 값. 'all'은 기간 전체. */
export const ALL_MONTHS = 'all'

export function monthOptions(count = 6): { value: string; label: string }[] {
  const now = new Date()
  const items: { value: string; label: string }[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = i === 0 ? '이번 달' : i === 1 ? '다음 달' : `${d.getMonth() + 1}월`
    items.push({ value: toYearMonth(d), label })
  }
  return items
}

export function monthLabel(value: string, style: 'relative' | 'plain' = 'relative'): string {
  if (value === ALL_MONTHS) return '전체 기간'
  const [y, m] = value.split('-').map(Number)
  if (style === 'relative') {
    const now = new Date()
    const diff = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth())
    if (diff === 0) return '이번 달'
    if (diff === 1) return '다음 달'
  }
  return y === new Date().getFullYear() ? `${m}월` : `${y}년 ${m}월`
}

/** 장소 앞에 시·군을 붙입니다. 용인시 밖 행사가 섞여도 어디인지 바로 보이게 (예: 수원시 · 빛누리아트홀). */
export function placeLabel(program: { city?: string | null; venue?: { name: string } | null }, empty = '장소 미정'): string {
  const name = program.venue?.name
  const city = program.city
  if (!name) return city ? `${city} · ${empty}` : empty
  if (!city || name.includes(city) || name.includes(city.slice(0, -1))) return name
  return `${city} · ${name}`
}
