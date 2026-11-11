// 받은 후기 한 장: 기관 · 별점 · 인원 · 공고와 같았는지 · 반응 · 내용 · 사진 · 답글(또는 답글 쓰기)
import { useState } from 'react'
import type { CheckAnswer, ProgramReview } from '@/api/types'
import { resolveAssetUrl } from '@/api/client'
import { Button, Textarea } from '@/components/ui'
import { CHECK_ANSWER_LABEL, REVIEW_REACTION_LABEL } from '@/lib/labels'
import { cn, formatShortDate, timeAgo } from '@/lib/format'

const REPLY_MAX = 1000

const ANSWER_TONE: Record<CheckAnswer, string> = {
  YES: 'bg-green-50 text-green-600',
  NO: 'bg-red-50 text-red-500',
  UNKNOWN: 'bg-gray-100 text-gray-500',
}

export function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-px" aria-label={`별점 ${rating}점`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden
          style={{ fontSize: size, lineHeight: 1 }}
          className={i <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}
        >
          ★
        </span>
      ))}
    </span>
  )
}

export function ReviewCard({
  review,
  onReply,
  replying,
}: {
  review: ProgramReview
  onReply: (content: string) => Promise<boolean>
  replying: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const people = review.participantCount + review.companionCount

  const submit = async () => {
    const text = draft.trim()
    if (!text) return
    if (await onReply(text)) {
      setDraft('')
      setOpen(false)
    }
  }

  return (
    <article className="flex w-full flex-col gap-3 rounded-2xl bg-gray-50 p-5">
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-[15px] font-bold text-gray-900">{review.organizationName}</p>
        {!review.isPublic && (
          <span className="inline-flex h-[22px] shrink-0 items-center rounded-[6px] bg-gray-200 px-1.5 text-[11.5px] font-medium text-gray-600">
            비공개
          </span>
        )}
        <div className="flex-1" />
        <span className="shrink-0 text-xs text-gray-400" title={formatShortDate(review.createdAt)}>
          {timeAgo(review.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Stars rating={review.rating} />
        <span className="text-[13px] font-bold text-gray-900">{review.rating}</span>
        <span className="text-xs text-gray-500">
          · {people}명 다녀감
          {review.companionCount > 0 ? ` (동반 ${review.companionCount}명 포함)` : ''}
        </span>
      </div>

      {review.checks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.checks.map((c) => (
            <span
              key={c.supportTagId}
              className={cn('inline-flex h-[26px] items-center gap-1 rounded-[7px] px-2 text-xs font-medium', ANSWER_TONE[c.answer])}
            >
              {c.label} · {CHECK_ANSWER_LABEL[c.answer]}
            </span>
          ))}
        </div>
      )}

      {review.mismatchNote && (
        <div className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] leading-[1.6] text-amber-700">
          <span className="font-bold">공고와 달랐던 점 </span>
          {review.mismatchNote}
        </div>
      )}

      {review.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.reactions.map((r) => (
            <span key={r} className="inline-flex h-[26px] items-center rounded-full border border-gray-200 bg-white px-2.5 text-xs text-gray-700">
              {REVIEW_REACTION_LABEL[r]}
            </span>
          ))}
        </div>
      )}

      {review.content && <p className="text-[14px] leading-[1.65] whitespace-pre-line text-gray-800">{review.content}</p>}

      {review.imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {review.imageUrls.map((url) => {
            const src = resolveAssetUrl(url)
            return (
              <a key={url} href={src} target="_blank" rel="noreferrer" className="block size-[88px] overflow-hidden rounded-xl bg-gray-200">
                <img src={src} alt="" className="size-full object-cover" />
              </a>
            )
          })}
        </div>
      )}

      {review.reply ? (
        <div className="flex flex-col gap-1 rounded-xl bg-white px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] font-bold text-brand">답글</span>
            <span className="truncate text-xs text-gray-500">{review.reply.organizationName}</span>
            <span className="text-xs text-gray-400">· {timeAgo(review.reply.createdAt)}</span>
          </div>
          <p className="text-[13.5px] leading-[1.6] whitespace-pre-line text-gray-700">{review.reply.content}</p>
        </div>
      ) : open ? (
        <div className="flex flex-col gap-2">
          <Textarea
            autoFocus
            value={draft}
            maxLength={REPLY_MAX}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="다녀간 기관에 고마운 마음이나 다음에 바꿀 점을 남겨 주세요. 답글은 한 번만 달 수 있어요."
          />
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs text-gray-400">
              {draft.length} / {REPLY_MAX}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={replying}>
              취소
            </Button>
            <Button size="sm" loading={replying} disabled={!draft.trim()} onClick={submit}>
              답글 달기
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            답글 쓰기
          </Button>
        </div>
      )}
    </article>
  )
}
