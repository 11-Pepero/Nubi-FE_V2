import { useInfiniteQuery } from '@tanstack/react-query'
import { programApi } from '@/api/endpoints'
import { errorMessage, resolveAssetUrl } from '@/api/client'
import type { ProgramReview } from '@/api/types'
import { CHECK_ANSWER_LABEL, REVIEW_REACTION_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { cn, formatDate } from '@/lib/format'
import { Tag } from '../Tag'

const PAGE_SIZE = 3

/** 09 프로그램 자세히 보기: 다녀온 기관들이 남긴 공개 후기. 로그인 없이도 볼 수 있어요. */
export function ProgramReviews({ programId }: { programId: number }) {
  const query = useInfiniteQuery({
    queryKey: qk.programReviews(programId),
    queryFn: ({ pageParam }) => programApi.reviews(programId, { page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })

  const reviews = query.data?.pages.flatMap((p) => p.content) ?? []
  const total = query.data?.pages[0]?.totalElements ?? 0
  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-[14px] font-bold text-gray-900">
          다녀온 기관 후기{total > 0 && <span className="ml-1 font-medium text-gray-500">{total}</span>}
        </h3>
        {average != null && (
          <span className="flex items-center gap-1 text-[13px] font-medium text-gray-700">
            <Stars rating={Math.round(average)} />
            {average.toFixed(1)}
          </span>
        )}
      </div>

      {query.isLoading ? (
        <p className="text-[12.5px] text-gray-400">후기를 불러오는 중이에요</p>
      ) : query.isError ? (
        <div className="flex items-center gap-2 text-[12.5px]">
          <p className="min-w-0 flex-1 text-red-500">후기를 불러오지 못했어요. {errorMessage(query.error)}</p>
          <button type="button" className="shrink-0 font-medium text-brand" onClick={() => query.refetch()}>
            다시 시도
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <p className="rounded-[14px] bg-gray-50 px-4 py-5 text-center text-[13px] text-gray-500">아직 후기가 없어요</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">
            {reviews.map((r) => (
              <ReviewItem key={r.reviewId} review={r} />
            ))}
          </ul>
          {query.hasNextPage && (
            <button
              type="button"
              disabled={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
              className="flex h-9 items-center justify-center rounded-[18px] border border-gray-200 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:text-gray-400"
            >
              {query.isFetchingNextPage ? '불러오는 중이에요' : '더 보기'}
            </button>
          )}
        </>
      )}
    </section>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`별점 ${rating}점`} className="flex text-[13px] leading-none tracking-[-1px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden className={n <= rating ? 'text-amber-400' : 'text-gray-200'}>
          ★
        </span>
      ))}
    </span>
  )
}

function ReviewItem({ review }: { review: ProgramReview }) {
  const people = review.companionCount ? `이용자 ${review.participantCount}명 + 동반 ${review.companionCount}명` : `이용자 ${review.participantCount}명`
  return (
    <li className="flex flex-col gap-2 rounded-[14px] bg-gray-50 px-4 py-3.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 truncate text-[13.5px] font-bold text-gray-900">{review.organizationName}</p>
        <Stars rating={review.rating} />
        <span className="flex-1" />
        <p className="shrink-0 text-xs text-gray-400">{formatDate(review.createdAt)}</p>
      </div>
      <p className="text-xs text-gray-500">{people}</p>

      {review.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.reactions.map((reaction) => (
            <Tag key={reaction} tone="white">
              {REVIEW_REACTION_LABEL[reaction]}
            </Tag>
          ))}
        </div>
      )}

      {review.checks.length > 0 && (
        <div className="flex flex-col gap-1 rounded-[10px] bg-white px-3 py-2">
          <p className="text-[11.5px] font-medium text-gray-400">공고에 적힌 대로였나요?</p>
          {review.checks.map((c) => (
            <div key={c.supportTagId} className="flex items-center gap-2 text-[12.5px]">
              <p className="min-w-0 flex-1 truncate text-gray-700">{c.label}</p>
              <span
                className={cn(
                  'shrink-0 font-medium',
                  c.answer === 'YES' ? 'text-brand' : c.answer === 'NO' ? 'text-red-500' : 'text-gray-400',
                )}
              >
                {CHECK_ANSWER_LABEL[c.answer]}
              </span>
            </div>
          ))}
          {review.mismatchNote && <p className="pt-0.5 text-[12.5px] text-gray-500">{review.mismatchNote}</p>}
        </div>
      )}
      {review.checks.length === 0 && review.mismatchNote && <p className="text-[12.5px] text-gray-500">{review.mismatchNote}</p>}

      {review.content && <p className="text-[13.5px] leading-[1.6] whitespace-pre-line text-gray-700">{review.content}</p>}

      {review.imageUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {review.imageUrls.map((url, i) => (
            <a
              key={`${url}-${i}`}
              href={resolveAssetUrl(url)}
              target="_blank"
              rel="noreferrer"
              className="block h-16 w-[86px] shrink-0 overflow-hidden rounded-lg bg-gray-200"
            >
              <img src={resolveAssetUrl(url)} alt={`${review.organizationName} 후기 사진 ${i + 1}`} className="size-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {review.reply && (
        <div className="flex flex-col gap-0.5 border-l-2 border-gray-200 pl-3">
          <p className="text-xs font-medium text-gray-500">{review.reply.organizationName}의 답글</p>
          <p className="text-[13px] leading-[1.6] whitespace-pre-line text-gray-700">{review.reply.content}</p>
        </div>
      )}
    </li>
  )
}
