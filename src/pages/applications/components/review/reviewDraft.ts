import type { CheckAnswer, ReviewReaction } from '@/api/types'

/** "임시 저장"은 이 브라우저에만 남겨요. 서버에는 임시 저장이 없어요. 사진은 남지 않아요. */
export interface ReviewDraft {
  rating: number
  answers: Record<number, CheckAnswer>
  mismatchNote: string
  reactions: ReviewReaction[]
  content: string
  isPublic: boolean
}

const key = (applicationId: number) => `nubi.review-draft.${applicationId}`

export function loadReviewDraft(applicationId: number): ReviewDraft | null {
  try {
    const raw = localStorage.getItem(key(applicationId))
    return raw ? (JSON.parse(raw) as ReviewDraft) : null
  } catch {
    return null
  }
}

export function saveReviewDraft(applicationId: number, draft: ReviewDraft): boolean {
  try {
    localStorage.setItem(key(applicationId), JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function clearReviewDraft(applicationId: number) {
  try {
    localStorage.removeItem(key(applicationId))
  } catch {
    // 지우지 못해도 괜찮아요.
  }
}
