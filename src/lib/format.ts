// 날짜·숫자 표시 도우미. 백엔드 LocalDateTime 문자열(타임존 없음)을 로컬 시각으로 읽습니다.
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 11월 9일 (일) */
export function formatDate(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return '-'
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
}

/** 11.9 (일) */
export function formatShortDate(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return '-'
  return `${d.getMonth() + 1}.${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

/** 수집 공고는 원문에 시각이 없으면 0시로 저장됩니다. 그때는 시각을 보여 주지 않습니다. */
export function hasTime(value: string | null | undefined): boolean {
  const d = parseDate(value)
  return !!d && !(d.getHours() === 0 && d.getMinutes() === 0)
}

/** 오후 2:00 (시각 미정이면 빈 문자열) */
export function formatTime(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d || !hasTime(value)) return ''
  const h = d.getHours()
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())}`
}

/** 11월 9일 (일) 오후 2:00 */
export function formatDateTime(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return '-'
  return hasTime(value) ? `${formatDate(value)} ${formatTime(value)}` : formatDate(value)
}

/** 시작~끝 시간 범위: 11월 9일 (일) 오후 2:00 – 4:00 */
export function formatRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return '-'
  if (!end) return formatDateTime(start)
  const s = parseDate(start)
  const e = parseDate(end)
  if (s && e && s.toDateString() === e.toDateString()) {
    // 끝 시각이 23:59(그날 끝까지)거나 시작 시각을 모르면 날짜만
    if (!hasTime(start) || (e.getHours() === 23 && e.getMinutes() === 59)) return formatDateTime(start)
    return `${formatDateTime(start)} – ${formatTime(end).replace(/^오[전후] /, '')}`
  }
  const endText = e && e.getHours() === 23 && e.getMinutes() === 59 ? formatDate(end) : formatDateTime(end)
  return `${formatDateTime(start)} – ${endText}`
}

/** D-3, D-day, 마감 */
export function dDay(value: string | null | undefined): string | null {
  const d = parseDate(value)
  if (!d) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) return '마감'
  if (diff === 0) return 'D-day'
  return `D-${diff}`
}

/** 3분 전, 2시간 전, 어제, 11월 9일 */
export function timeAgo(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return ''
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 172800) return '어제'
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** yyyy-MM (YearMonth 파라미터) */
export function toYearMonth(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

/** <input type="datetime-local"> 값 → 백엔드 LocalDateTime 문자열 */
export function fromDateTimeInput(value: string): string | null {
  if (!value) return null
  return value.length === 16 ? `${value}:00` : value
}

/** 백엔드 LocalDateTime 문자열 → <input type="datetime-local"> 값 */
export function toDateTimeInput(value: string | null | undefined): string {
  return value ? value.slice(0, 16) : ''
}

export function formatNumber(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('ko-KR')
}

/** 그룹 공통 지원 칩 문구: "휠체어 3명", "동반 인력 1명당 2명" */
export function supportText(s: { label: string; quantity?: number | null; ratio?: string | null; note?: string | null }) {
  if (s.ratio) {
    const [a, b] = s.ratio.split(':')
    return `${s.label} ${a}명당 ${b}명`
  }
  if (s.quantity) return `${s.label} ${s.quantity}명`
  return s.note ? `${s.label} · ${s.note}` : s.label
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
