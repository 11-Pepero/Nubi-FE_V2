// 11 행사 관리 · 내 행사
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { eventApi } from '@/api/endpoints'
import type { ProgramStatus } from '@/api/types'
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, UnderlineTabs } from '@/components/ui'
import { formatShortDate } from '@/lib/format'
import { qk } from '@/lib/queryKeys'
import { EventRow } from './list/EventRow'

type Tab = 'ongoing' | 'past' | 'draft'

const TAB_STATUS: Record<Tab, ProgramStatus[]> = {
  ongoing: ['OPEN', 'CLOSED'],
  past: ['ENDED'],
  draft: ['DRAFT'],
}

const PAGE_SIZE = 20

export default function MyEventsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('ongoing')

  const dashboard = useQuery({ queryKey: qk.eventDashboard, queryFn: eventApi.dashboard })
  const d = dashboard.data

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="행사 관리"
        actions={<Button onClick={() => navigate('/app/events/new')}>새 행사 올리기</Button>}
      />

      <div className="flex w-full gap-3 pb-5">
        <StatCard label="진행 중인 행사" value={d ? `${d.ongoingEventCount}개` : '-'} />
        <StatCard label="새 신청" value={d ? `${d.newApplicationCount}건` : '-'} brand />
        <StatCard
          label="이번 달 참여 예정"
          value={d ? `${d.upcomingParticipantCount + d.upcomingCompanionCount}명` : '-'}
          hint={d && d.upcomingCompanionCount > 0 ? `동반 ${d.upcomingCompanionCount}명 포함` : undefined}
        />
        <StatCard label="받은 후기" value={d ? `${d.reviewCount}개` : '-'} />
      </div>

      <UnderlineTabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'ongoing', label: '진행 중', count: d?.ongoingEventCount },
          { value: 'past', label: '지난 행사', count: d?.pastEventCount },
          { value: 'draft', label: '임시 저장', count: d?.draftEventCount },
        ]}
      />

      <EventList key={tab} tab={tab} />

      {tab === 'ongoing' && <RecentEnded />}
    </div>
  )
}

function StatCard({ label, value, brand, hint }: { label: string; value: string; brand?: boolean; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-2xl bg-gray-50 px-5 py-4">
      <span className="text-[12.5px] font-medium text-gray-500">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className={brand ? 'text-2xl font-bold text-brand' : 'text-2xl font-bold text-gray-900'}>{value}</span>
        {hint && <span className="truncate text-xs text-gray-400">{hint}</span>}
      </div>
    </div>
  )
}

function EventList({ tab }: { tab: Tab }) {
  const navigate = useNavigate()
  const status = TAB_STATUS[tab]
  const query = useInfiniteQuery({
    queryKey: qk.myEvents({ status, size: PAGE_SIZE }),
    queryFn: ({ pageParam }) => eventApi.myEvents({ status, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })

  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const events = query.data.pages.flatMap((p) => p.content)

  if (events.length === 0) {
    const empty: Record<Tab, { title: string; description: string }> = {
      ongoing: { title: '진행 중인 행사가 없어요', description: '새 행사를 올리면 다른 기관이 지원 카드로 신청할 수 있어요.' },
      past: { title: '지난 행사가 없어요', description: '끝난 행사가 여기에 모여요.' },
      draft: { title: '임시 저장한 행사가 없어요', description: '쓰다 만 행사는 임시 저장해 두고 나중에 이어서 쓸 수 있어요.' },
    }
    return (
      <div className="pt-4">
        <EmptyState
          {...empty[tab]}
          action={
            tab !== 'past' ? (
              <Button onClick={() => navigate('/app/events/new')}>새 행사 올리기</Button>
            ) : undefined
          }
        />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3 pt-4">
      {events.map((event) => (
        <EventRow key={event.eventId} event={event} />
      ))}
      {query.hasNextPage && (
        <div className="flex justify-center pt-1">
          <Button variant="outline" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
            더 보기
          </Button>
        </div>
      )}
    </div>
  )
}

/** 진행 중 탭 아래 "최근 끝난 행사" — 지난 행사 중 가장 최근 3개. */
function RecentEnded() {
  // 목록은 시작일 오름차순이라, 넉넉히 받아 뒤에서부터 3개를 씁니다.
  const query = useQuery({
    queryKey: qk.myEvents({ status: ['ENDED'], size: 100, recent: true }),
    queryFn: () => eventApi.myEvents({ status: ['ENDED'], size: 100 }),
  })
  const recent = (query.data?.content ?? []).slice(-3).reverse()
  if (recent.length === 0) return null

  return (
    <div className="flex w-full flex-col gap-2 pt-5">
      <p className="text-[14px] font-bold text-gray-900">최근 끝난 행사</p>
      {recent.map((event) => (
        <div
          key={event.eventId}
          className="flex h-[60px] w-full items-center gap-4 rounded-[14px] border border-gray-200 pr-5 pl-4"
        >
          <p className="shrink-0 truncate text-[14px] font-bold text-gray-900">{event.title}</p>
          <p className="min-w-0 truncate text-[13px] text-gray-500">
            {formatShortDate(event.startAt)} · {event.applicationOrgCount}개 기관 · {event.participantCount}명 참여
          </p>
          <div className="flex-1" />
          <span className="shrink-0 text-[13px] text-gray-500">
            {event.reviewCount > 0 ? (
              <>
                {event.averageRating != null && (
                  <span className="font-bold text-gray-900">
                    <span className="text-amber-400">★</span> {event.averageRating.toFixed(1)}
                  </span>
                )}
                {event.averageRating != null ? ' · ' : ''}후기 {event.reviewCount}개
              </>
            ) : (
              '아직 후기가 없어요'
            )}
          </span>
          <Link
            to={`/app/events/${event.eventId}/reviews`}
            className="shrink-0 text-[13px] font-medium text-brand hover:text-brand-strong"
          >
            후기 보기
          </Link>
        </div>
      ))}
    </div>
  )
}
