import type { EventSummary } from '@/api/types'
import { formatShortDate, parseDate } from '@/lib/format'

/** 11.21 (토) 13:00 */
export function shortDateTime(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return '-'
  return `${formatShortDate(value)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function eventLink(event: Pick<EventSummary, 'eventId' | 'status'>): string {
  return event.status === 'DRAFT' ? `/app/events/${event.eventId}/edit` : `/app/events/${event.eventId}/applications`
}
