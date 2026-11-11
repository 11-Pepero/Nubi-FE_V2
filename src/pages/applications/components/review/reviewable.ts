import type { ApplicationStatus, DateTimeString } from '@/api/types'
import { parseDate } from '@/lib/format'

/** 후기는 참여 확정(CONFIRMED)이나 다녀왔어요(ATTENDED)이고 행사가 시작된 신청에만 쓸 수 있어요. */
export function canReview(status: ApplicationStatus, startAt: DateTimeString, now: number = Date.now()): boolean {
  if (status !== 'CONFIRMED' && status !== 'ATTENDED') return false
  const start = parseDate(startAt)
  return start != null && start.getTime() <= now
}

/** 후기 쓰기 화면 주소. 이미 남긴 후기가 있으면 reviewId를 붙여 고치기로 엽니다. */
export function reviewPath(applicationId: number, reviewId?: number | null): string {
  const base = `/app/applications/${applicationId}/review`
  return reviewId ? `${base}?reviewId=${reviewId}` : base
}

export const reviewButtonLabel = (reviewId?: number | null) => (reviewId ? '후기 고치기' : '후기 남기기')
