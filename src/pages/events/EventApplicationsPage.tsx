// 12 신청 기관 목록 / 13 신청 내용 자세히 (applicationId 가 있으면 오른쪽 패널)
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { eventApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { ApplicationStatus, EventApplicationSummary } from '@/api/types'
import { Button, EmptyState, ErrorState, LoadingState, SegmentedTabs, useToast, type TabItem } from '@/components/ui'
import { cn } from '@/lib/format'
import { EventDetailHeader } from './detail/EventDetailHeader'
import { ApplicationPanel } from './detail/ApplicationPanel'
import { StatCards, StatusBadge } from './detail/shared'
import {
  applicationStatItems,
  submittedText,
  supportChipText,
  useApplicationList,
  useEventId,
  useEventNeeds,
  wheelchairCount,
} from './detail/utils'

type Filter = 'ALL' | Extract<ApplicationStatus, 'SUBMITTED' | 'INQUIRY' | 'CONFIRMED'>
const FILTERS: Filter[] = ['ALL', 'SUBMITTED', 'INQUIRY', 'CONFIRMED']
const FILTER_LABEL: Record<Filter, string> = { ALL: '전체', SUBMITTED: '새 신청', INQUIRY: '문의 있음', CONFIRMED: '확정' }

// 표 열 너비 (Figma 기준)
const COL = {
  org: 'w-[200px]',
  people: 'w-[110px]',
  care: 'w-[80px]',
  status: 'w-[90px]',
  date: 'w-[70px]',
  more: 'w-[70px]',
}

export default function EventApplicationsPage() {
  const eventId = useEventId()
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [downloading, setDownloading] = useState(false)

  const filterParam = searchParams.get('status') as Filter | null
  const filter: Filter = filterParam && FILTERS.includes(filterParam) ? filterParam : 'ALL'
  const page = Math.max(0, Number(searchParams.get('page') ?? 0) || 0)

  const summary = useApplicationList(eventId)
  const list = useApplicationList(eventId, filter === 'ALL' ? undefined : filter, page)
  const needs = useEventNeeds(eventId)

  const stats = summary.data
  const wheelchair =
    wheelchairCount(needs.data) ??
    // needs 를 못 받으면 지금 보이는 목록에서 셉니다.
    (stats
      ? stats.applications.content
          .flatMap((a) => a.supports)
          .filter((s) => s.code === 'WHEELCHAIR' || s.code === 'POWER_WHEELCHAIR')
          .reduce((sum, s) => sum + (s.quantity ?? 0), 0)
      : null)

  const counts = stats?.statusCounts ?? {}
  const total = Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0)
  const tabs: TabItem<Filter>[] = FILTERS.map((f) => ({
    value: f,
    label: FILTER_LABEL[f],
    count: stats ? (f === 'ALL' ? total : (counts[f] ?? 0)) : null,
  }))

  const search = searchParams.toString()
  const listPath = `/app/events/${eventId}/applications${search ? `?${search}` : ''}`
  const closePanel = useCallback(() => navigate(listPath), [navigate, listPath])

  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(searchParams)
    if (f === 'ALL') next.delete('status')
    else next.set('status', f)
    next.delete('page')
    setSearchParams(next)
  }
  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams)
    if (p === 0) next.delete('page')
    else next.set('page', String(p))
    setSearchParams(next)
  }

  const download = async () => {
    setDownloading(true)
    try {
      await eventApi.exportApplications(eventId)
    } catch (e) {
      toast.show(errorMessage(e), { tone: 'error' })
    } finally {
      setDownloading(false)
    }
  }

  const rows = list.data?.applications
  return (
    <div className="flex w-full flex-col">
      <EventDetailHeader eventId={eventId} active="applications" />

      <StatCards items={applicationStatItems(stats, wheelchair)} />

      <div className="flex w-full items-center gap-2 pt-5 pb-2.5">
        <SegmentedTabs items={tabs} value={filter} onChange={setFilter} />
        <span className="flex-1" />
        <button
          type="button"
          onClick={download}
          disabled={downloading || total === 0}
          className="px-1 text-[13px] font-medium text-gray-600 hover:text-gray-900 disabled:text-gray-300"
        >
          {downloading ? '내려받는 중…' : '명단 내려받기'}
        </button>
        <button
          type="button"
          disabled
          title="안내 문자 보내기는 준비 중이에요"
          className="px-1 text-[13px] font-medium text-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          확정 기관에 안내 문자
        </button>
      </div>

      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : !rows || rows.content.length === 0 ? (
        <EmptyState
          title={filter === 'ALL' ? '아직 들어온 신청이 없어요' : `${FILTER_LABEL[filter]} 신청이 없어요`}
          description={filter === 'ALL' ? '다른 기관이 신청하면 여기에 바로 보여요.' : undefined}
        />
      ) : (
        <>
          <div className="flex w-full flex-col rounded-2xl bg-gray-50 px-2 pt-1 pb-2">
            <div className="flex h-10 items-center gap-3 pr-3 pl-4 text-xs font-medium text-gray-400">
              <span className={cn('shrink-0', COL.org)}>신청 기관</span>
              <span className={cn('shrink-0', COL.people)}>인원</span>
              <span className="min-w-0 flex-1">필요한 지원</span>
              <span className={cn('shrink-0', COL.care)}>개별 케어</span>
              <span className={cn('shrink-0', COL.status)}>상태</span>
              <span className={cn('shrink-0', COL.date)}>신청</span>
              <span className={cn('shrink-0', COL.more)} />
            </div>
            {rows.content.map((row, i) => (
              <ApplicationRow
                key={row.applicationId}
                row={row}
                first={i === 0}
                selected={String(row.applicationId) === applicationId}
                to={`/app/events/${eventId}/applications/${row.applicationId}${search ? `?${search}` : ''}`}
              />
            ))}
          </div>
          {rows.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                이전
              </Button>
              <span className="text-[13px] text-gray-500">
                {page + 1} / {rows.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= rows.totalPages}
                onClick={() => setPage(page + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}

      {applicationId && Number.isFinite(Number(applicationId)) && (
        <ApplicationPanel
          key={applicationId}
          eventId={eventId}
          applicationId={Number(applicationId)}
          onClose={closePanel}
        />
      )}
    </div>
  )
}

function ApplicationRow({
  row,
  first,
  selected,
  to,
}: {
  row: EventApplicationSummary
  first: boolean
  selected: boolean
  to: string
}) {
  const sub = [row.groupName, row.contactName && `담당 ${row.contactName}`].filter(Boolean).join(' · ')
  return (
    <Link
      to={to}
      className={cn(
        'group flex min-h-[66px] items-center gap-3 rounded-xl py-3 pr-3 pl-4 transition-colors hover:bg-white',
        !first && 'border-t border-gray-200',
        selected && 'bg-white',
      )}
    >
      <div className={cn('flex shrink-0 flex-col gap-0.5', COL.org)}>
        <p className="truncate text-[13.5px] font-bold text-gray-900">{row.organizationName}</p>
        {sub && <p className="truncate text-xs text-gray-500">{sub}</p>}
      </div>
      <div className={cn('flex shrink-0 flex-col gap-0.5', COL.people)}>
        <p className="text-[13.5px] font-medium text-gray-900">{row.participantCount}명</p>
        <p className="text-xs text-gray-500">동반 {row.companionCount}명</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {row.supports.length === 0 ? (
          <span className="text-[13px] text-gray-400">없음</span>
        ) : (
          row.supports.map((s) => (
            <span
              key={s.applicationSupportId}
              className={cn(
                'inline-flex h-[26px] items-center rounded-[7px] px-2 text-xs font-medium whitespace-nowrap text-gray-700',
                selected ? 'bg-gray-50' : 'bg-white group-hover:bg-gray-50',
              )}
            >
              {supportChipText(s)}
            </span>
          ))
        )}
      </div>
      <p className={cn('shrink-0 text-[13px] text-gray-700', COL.care)}>
        {row.careCount > 0 ? `${row.careCount}명` : '없음'}
      </p>
      <div className={cn('flex shrink-0', COL.status)}>
        <StatusBadge status={row.status} />
      </div>
      <p className={cn('shrink-0 text-[13px] text-gray-700', COL.date)}>{submittedText(row.submittedAt)}</p>
      <p className={cn('shrink-0 text-[13px] font-medium text-brand', COL.more)}>자세히</p>
    </Link>
  )
}
