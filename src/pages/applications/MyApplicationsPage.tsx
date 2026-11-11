// 05 신청 현황
import { useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applicationApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { ApplicationStatus, MyApplicationSummary } from '@/api/types'
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, UnderlineTabs, useToast } from '@/components/ui'
import { qk } from '@/lib/queryKeys'
import { cn, dDay } from '@/lib/format'
import { StepProgress } from './components/StepProgress'
import { ApplicationDetailModal } from './components/ApplicationDetailModal'
import { canReview, reviewButtonLabel, reviewPath } from './components/review/reviewable'
import { applyMethodChipLabel, peopleText, rowDate } from './components/format'

type Tab = 'ALL' | 'PREPARING' | 'WAITING' | 'CONFIRMED' | 'ATTENDED'

const TAB_STATUS: Record<Tab, ApplicationStatus[] | undefined> = {
  ALL: undefined,
  PREPARING: ['PREPARING'],
  WAITING: ['SUBMITTED', 'INQUIRY', 'WAITING'],
  CONFIRMED: ['CONFIRMED'],
  ATTENDED: ['ATTENDED'],
}

export default function MyApplicationsPage() {
  const [tab, setTab] = useState<Tab>('ALL')
  const [detailId, setDetailId] = useState<number | null>(null)

  const summary = useQuery({ queryKey: qk.myApplicationSummary, queryFn: applicationApi.summary })
  const params = { status: TAB_STATUS[tab], size: 100 }
  const list = useQuery({ queryKey: qk.myApplications(params), queryFn: () => applicationApi.list(params) })
  const s = summary.data
  const detailReviewId = list.data?.content.find((a) => a.applicationId === detailId)?.reviewId ?? null

  return (
    <div className="flex w-full flex-col">
      <PageHeader title="신청 현황" />

      <div className="flex w-full gap-3">
        <SummaryCard label="준비 중" value={s?.preparing} hint="신청서와 문의문을 만들었어요" />
        <SummaryCard label="접수 기다림" value={s?.waiting} hint="기관 답을 기다리고 있어요" />
        <SummaryCard label="참여 예정" value={s?.upcoming} hint={`이번 주 ${s?.upcomingThisWeek ?? 0}건`} highlight />
        <SummaryCard
          label="다녀왔어요"
          value={s?.attended}
          hint={s?.reviewPending ? `후기 ${s.reviewPending}건을 남겨 주세요` : '다녀온 뒤 후기를 남겨 주세요'}
        />
      </div>

      <div className="pt-5">
        <UnderlineTabs<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'ALL', label: '전체', count: s?.total },
            { value: 'PREPARING', label: '준비 중', count: s?.preparing },
            { value: 'WAITING', label: '접수 기다림', count: s?.waiting },
            { value: 'CONFIRMED', label: '참여 예정', count: s?.upcoming },
            { value: 'ATTENDED', label: '다녀왔어요', count: s?.attended },
          ]}
        />
      </div>

      <div className="flex w-full flex-col gap-2 pt-4">
        {list.isLoading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : !list.data?.content.length ? (
          <EmptyState
            title="아직 신청한 프로그램이 없어요"
            description="참여 가능한 프로그램을 찾아 신청을 준비해 보세요."
          />
        ) : (
          list.data.content.map((a) => <ApplicationRow key={a.applicationId} item={a} onOpen={() => setDetailId(a.applicationId)} />)
        )}
      </div>

      <p className="pt-3.5 text-[13px] text-gray-500">
        외부 기관 접수는 대신 넣지 않아요. 담당자가 전화나 서면으로 접수한 뒤 접수 완료를 눌러 주세요.
      </p>

      <ApplicationDetailModal applicationId={detailId} reviewId={detailReviewId} onClose={() => setDetailId(null)} />
    </div>
  )
}

function SummaryCard({ label, value, hint, highlight }: { label: string; value?: number; hint: string; highlight?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-2xl bg-gray-50 px-5 py-4 whitespace-nowrap">
      <p className="text-[12.5px] font-medium text-gray-500">{label}</p>
      <p className={cn('text-[26px] font-bold', highlight ? 'text-brand' : 'text-gray-900')}>{value ?? '-'}</p>
      <p className="truncate text-[12.5px] text-gray-500">{hint}</p>
    </div>
  )
}

function ApplicationRow({ item, onOpen }: { item: MyApplicationSummary; onOpen: () => void }) {
  const upcoming = item.status === 'CONFIRMED' ? dDay(item.startAt) : null
  const place = item.venueName ?? item.hostName
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="flex min-h-[72px] w-full cursor-pointer items-center gap-4 rounded-[14px] bg-gray-50 py-3 pr-4 pl-5 hover:bg-gray-100"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex min-w-0 items-center gap-2 font-bold">
          <p className="truncate text-[14.5px] text-gray-900">{item.programTitle}</p>
          {upcoming && upcoming !== '마감' && <span className="shrink-0 text-[12.5px] text-brand">{upcoming}</span>}
        </div>
        <p className="truncate text-[12.5px] text-gray-500">
          {place ? `${place} · ` : ''}
          {rowDate(item.startAt)}
        </p>
      </div>
      <div className="flex w-[120px] shrink-0 flex-col gap-0.5 whitespace-nowrap">
        <p className="truncate text-[13px] font-medium text-gray-700">{item.groupName ?? '-'}</p>
        <p className="text-xs text-gray-500">{peopleText(item.participantCount, item.companionCount)}</p>
      </div>
      <div className="flex w-[90px] shrink-0">
        <span
          className={cn(
            'flex h-[26px] items-center rounded-[7px] px-2 text-xs font-medium whitespace-nowrap',
            item.applyMethod === 'DIRECT' ? 'bg-brand-soft text-brand' : 'bg-white text-gray-700',
          )}
        >
          {applyMethodChipLabel(item.applyMethod)}
        </span>
      </div>
      <div className="flex w-[220px] shrink-0">
        <StepProgress step={item.step} status={item.status} />
      </div>
      <div className="flex w-[132px] shrink-0 justify-end">
        <RowAction item={item} onOpen={onOpen} />
      </div>
    </div>
  )
}

const pill = 'h-[34px] rounded-[17px] text-[13px]'

function RowAction({ item, onOpen }: { item: MyApplicationSummary; onOpen: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [now] = useState(() => Date.now())
  const submit = useMutation({
    mutationFn: () =>
      applicationApi.markSubmitted(item.applicationId, {
        channel: item.applyMethod === 'DIRECT' ? undefined : item.applyMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.show('접수 완료로 표시했어요')
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation()
    fn()
  }

  if (item.status === 'PREPARING') {
    if (item.applyMethod === 'ONLINE' && item.applyUrl) {
      return (
        <Button variant="outline" className={pill} onClick={stop(() => window.open(item.applyUrl!, '_blank', 'noopener'))}>
          접수 링크 열기
        </Button>
      )
    }
    if (item.applyMethod === 'PHONE') {
      return (
        <Button className={pill} loading={submit.isPending} onClick={stop(() => submit.mutate())}>
          접수 완료 표시
        </Button>
      )
    }
    return (
      <Button variant="outline" className={pill} onClick={stop(() => navigate(`/app/prepare?programId=${item.programId}`))}>
        신청서 이어 쓰기
      </Button>
    )
  }
  if (canReview(item.status, item.startAt, now)) {
    return (
      <Button variant="outline" className={pill} onClick={stop(() => navigate(reviewPath(item.applicationId, item.reviewId)))}>
        {reviewButtonLabel(item.reviewId)}
      </Button>
    )
  }
  if (item.status === 'CONFIRMED') {
    return (
      <Button variant="soft" className={pill} onClick={stop(onOpen)}>
        참가 안내 보기
      </Button>
    )
  }
  if (item.status === 'SUBMITTED' || item.status === 'INQUIRY' || item.status === 'WAITING') {
    return (
      <Button variant="ghost" className={pill} onClick={stop(onOpen)}>
        신청 내용 보기
      </Button>
    )
  }
  return null
}
