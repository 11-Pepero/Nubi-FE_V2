// 16 받은 후기 — 행사에 다녀간 기관이 남긴 후기(비공개 포함)와 집계, AI 요약, 답글 달기
import { useState } from 'react'
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { eventApi, reviewApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { ReceivedReviews, ReviewReplyResult } from '@/api/types'
import { EmptyState, ErrorState, LoadingState, SegmentedTabs, useToast, LoadMore } from '@/components/ui'
import { qk } from '@/lib/queryKeys'
import { EventDetailHeader } from './detail/EventDetailHeader'
import { StatCards } from './detail/shared'
import type { StatItem } from './detail/utils'
import { useEventId } from './detail/utils'
import { CheckBars, ReactionCounts, ReviewSummaryPanel } from './reviews/ReviewAside'
import { ReviewCard } from './reviews/ReviewCard'

type Sort = 'latest' | 'lowest' | 'photo'

const SORT_PARAMS: Record<Sort, { sort: 'LATEST' | 'RATING_ASC'; photoOnly: boolean }> = {
  latest: { sort: 'LATEST', photoOnly: false },
  lowest: { sort: 'RATING_ASC', photoOnly: false },
  photo: { sort: 'LATEST', photoOnly: true },
}

const PAGE_SIZE = 10

function statItems(stats: ReceivedReviews['stats'] | undefined): StatItem[] {
  return [
    { label: '받은 후기', value: stats ? `${stats.reviewCount}개` : '-' },
    { label: '평균 별점', value: stats?.averageRating != null ? `★ ${stats.averageRating.toFixed(1)}` : '-' },
    {
      label: '다녀간 기관 · 인원',
      value: stats ? `${stats.organizationCount}곳 · ${stats.participantCount + stats.companionCount}명` : '-',
    },
    { label: '답글 기다리는 후기', value: stats ? `${stats.awaitingReplyCount}개` : '-', highlight: !!stats?.awaitingReplyCount },
  ]
}

export default function EventReviewsPage() {
  const eventId = useEventId()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [sort, setSort] = useState<Sort>('latest')
  const [replyingId, setReplyingId] = useState<number | null>(null)

  const params = { ...SORT_PARAMS[sort], size: PAGE_SIZE }
  const query = useInfiniteQuery({
    queryKey: qk.eventReviews(eventId, params),
    queryFn: ({ pageParam }) => eventApi.reviews(eventId, { ...params, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.reviews.page + 1 < last.reviews.totalPages ? last.reviews.page + 1 : undefined),
  })

  // 요약(AI)은 다시 부르지 않도록 목록 쿼리만 새로 고칩니다.
  const refreshLists = () =>
    queryClient.invalidateQueries({
      queryKey: ['events', eventId, 'reviews'],
      predicate: (q) => q.queryKey[3] !== 'summary',
    })

  const putReply = (reviewId: number, reply: ReviewReplyResult) => {
    queryClient.setQueriesData<InfiniteData<ReceivedReviews>>(
      { queryKey: ['events', eventId, 'reviews'], predicate: (q) => q.queryKey[3] !== 'summary' },
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            reviews: {
              ...p.reviews,
              content: p.reviews.content.map((r) =>
                r.reviewId === reviewId
                  ? { ...r, reply: { organizationName: reply.organizationName, content: reply.content, createdAt: reply.createdAt } }
                  : r,
              ),
            },
          })),
        },
    )
  }

  const reply = async (reviewId: number, content: string): Promise<boolean> => {
    setReplyingId(reviewId)
    try {
      const result = await reviewApi.reply(reviewId, content)
      putReply(reviewId, result)
      toast.show('답글을 달았어요')
      return true
    } catch (e) {
      toast.show(errorMessage(e), { tone: 'error' })
      return false
    } finally {
      setReplyingId(null)
      refreshLists()
    }
  }

  const first = query.data?.pages[0]
  const reviews = query.data?.pages.flatMap((p) => p.reviews.content) ?? []
  const total = first?.reviews.totalElements

  return (
    <div className="flex w-full flex-col">
      <EventDetailHeader eventId={eventId} active="reviews" />
      <StatCards items={statItems(first?.stats)} />

      <div className="flex w-full items-start gap-5 pt-5">
        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-3">
            <SegmentedTabs
              items={[
                { value: 'latest', label: '최신순' },
                { value: 'lowest', label: '별점 낮은 순' },
                { value: 'photo', label: '사진 있는 후기' },
              ]}
              value={sort}
              onChange={setSort}
            />
            {total != null && <span className="text-xs font-medium text-gray-500">{total}개</span>}
          </div>

          {query.isPending ? (
            <LoadingState />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : reviews.length === 0 ? (
            sort === 'photo' && (first?.stats.reviewCount ?? 0) > 0 ? (
              <EmptyState title="사진이 있는 후기가 없어요" description="사진을 함께 남긴 후기가 생기면 여기에 모여요." />
            ) : (
              <EmptyState
                title="아직 받은 후기가 없어요"
                description={
                  <>
                    행사에 다녀간 기관이 후기를 남기면 여기서 모아 볼 수 있어요.
                    <br />
                    별점, 공고와 같았는지, 답글 달기를 이곳에서 할 수 있어요.
                  </>
                }
              />
            )
          ) : (
            <>
              {reviews.map((r) => (
                <ReviewCard
                  key={r.reviewId}
                  review={r}
                  replying={replyingId === r.reviewId}
                  onReply={(content) => reply(r.reviewId, content)}
                />
              ))}
              <LoadMore query={query} className="pt-1" />
            </>
          )}
        </section>

        <aside className="flex w-[360px] shrink-0 flex-col gap-4">
          <CheckBars checks={first?.checks ?? []} />
          {first && <ReactionCounts reactions={first.reactions} />}
          {(first?.stats.reviewCount ?? 0) > 0 && <ReviewSummaryPanel eventId={eventId} />}
        </aside>
      </div>
    </div>
  )
}
