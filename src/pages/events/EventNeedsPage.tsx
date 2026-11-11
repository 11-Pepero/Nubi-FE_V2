// 14 필요 지원 모아보기
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { eventApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { EventNeeds, PrepStatus } from '@/api/types'
import { EmptyState, ErrorState, LoadingState, useToast } from '@/components/ui'
import { HOST_APPLICATION_STATUS_LABEL, PREP_STATUS_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { cn } from '@/lib/format'
import { EventDetailHeader } from './detail/EventDetailHeader'
import { PrepCheckbox, StatCards } from './detail/shared'
import { PREP_ORDER, applicationStatItems, useEventId, useEventNeeds, wheelchairCount } from './detail/utils'

type NeedItem = EventNeeds['items'][number]
type Breakdown = NeedItem['breakdown'][number]

const CHIP_TONE: Record<PrepStatus, string> = {
  PENDING: 'bg-white text-gray-700 border border-gray-200',
  READY: 'bg-green-50 text-green-600 border border-transparent',
  CHECK: 'bg-amber-50 text-amber-500 border border-transparent',
}

export default function EventNeedsPage() {
  const eventId = useEventId()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const needs = useEventNeeds(eventId)
  const [busy, setBusy] = useState<Set<number>>(new Set())

  const updateRows = async (rows: Breakdown[], prepStatus: PrepStatus) => {
    const ids = rows.map((r) => r.applicationSupportId)
    setBusy((prev) => new Set([...prev, ...ids]))
    try {
      await Promise.all(
        rows.map(async (r) => {
          // 백엔드는 hostNote 를 비우면 지워 버리므로, 신청 상세에서 지금 메모를 읽어 함께 보냅니다.
          const detail = await queryClient.fetchQuery({
            queryKey: qk.eventApplication(eventId, r.applicationId),
            queryFn: () => eventApi.application(eventId, r.applicationId),
            staleTime: 10_000,
          })
          const hostNote = detail.supports.find((s) => s.applicationSupportId === r.applicationSupportId)?.hostNote
          const updated = await eventApi.updateSupportPrep(eventId, r.applicationId, r.applicationSupportId, {
            prepStatus,
            hostNote: hostNote ?? undefined,
          })
          queryClient.setQueryData(qk.eventApplication(eventId, r.applicationId), updated)
        }),
      )
    } catch (e) {
      toast.show(errorMessage(e), { tone: 'error' })
    } finally {
      setBusy((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      await queryClient.invalidateQueries({ queryKey: qk.eventNeeds(eventId) })
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'applications'] })
    }
  }

  const data = needs.data
  const items = data?.items ?? []

  return (
    <div className="flex w-full flex-col">
      <EventDetailHeader eventId={eventId} active="needs" />
      <StatCards items={applicationStatItems(data, wheelchairCount(data))} />

      {needs.isLoading ? (
        <LoadingState />
      ) : needs.isError || !data ? (
        <ErrorState error={needs.error} onRetry={() => needs.refetch()} />
      ) : (
        <div className="flex w-full items-start gap-5 pt-5">
          {/* 왼쪽: 행사 날 준비할 것 */}
          <section className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex items-center">
              <h2 className="flex-1 text-[15px] font-bold text-gray-900">행사 날 준비할 것</h2>
              {items.length > 0 && (
                <span className="text-xs font-medium text-gray-500">
                  {data.readyItemCount} / {items.length} 준비함
                </span>
              )}
            </div>
            {items.length === 0 ? (
              <EmptyState title="모을 지원이 아직 없어요" description="신청이 들어오면 기관별로 필요한 지원을 여기서 한 번에 챙길 수 있어요." />
            ) : (
              items.map((item) => (
                <NeedRow
                  key={item.supportTagId}
                  item={item}
                  busy={busy}
                  onToggleAll={() =>
                    updateRows(
                      item.breakdown.filter((b) => (item.prepStatus === 'READY' ? true : b.prepStatus !== 'READY')),
                      item.prepStatus === 'READY' ? 'PENDING' : 'READY',
                    )
                  }
                  onCycle={(row) =>
                    updateRows([row], PREP_ORDER[(PREP_ORDER.indexOf(row.prepStatus) + 1) % PREP_ORDER.length])
                  }
                />
              ))
            )}
          </section>

          {/* 오른쪽: 개별 케어, 오는 방법 */}
          <aside className="flex w-[360px] shrink-0 flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-5">
              <div className="flex items-center">
                <h2 className="flex-1 text-[15px] font-bold text-gray-900">개별 케어 모아보기</h2>
                <span className="text-xs font-medium text-gray-500">{data.cares.length}명</span>
              </div>
              {data.cares.length === 0 ? (
                <p className="text-[13px] text-gray-500">알려 준 개별 케어가 없어요</p>
              ) : (
                data.cares.map((c, i) => (
                  <button
                    key={`${c.applicationId}-${i}`}
                    type="button"
                    onClick={() => navigate(`/app/events/${eventId}/applications/${c.applicationId}`)}
                    className="flex flex-col gap-1 rounded-xl bg-white px-3.5 py-2.5 text-left hover:shadow-[0_1px_3px_rgba(17,24,39,0.08)]"
                  >
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className="shrink-0 text-[13.5px] font-bold text-gray-900">{c.alias}</span>
                      <span className="truncate text-xs text-gray-500">{c.organizationName}</span>
                    </span>
                    {c.content && <span className="text-xs leading-[1.5] text-gray-600">{c.content}</span>}
                  </button>
                ))
              )}
            </div>

            <div className="flex flex-col gap-2.5 rounded-2xl bg-gray-50 p-5">
              <h2 className="text-[15px] font-bold text-gray-900">오는 방법</h2>
              {data.arrivals.length === 0 ? (
                <p className="text-[13px] text-gray-500">아직 오는 기관이 없어요</p>
              ) : (
                data.arrivals.map((a) => (
                  <button
                    key={a.applicationId}
                    type="button"
                    onClick={() => navigate(`/app/events/${eventId}/applications/${a.applicationId}`)}
                    className="flex items-center gap-3 text-left hover:opacity-80"
                    title={`${HOST_APPLICATION_STATUS_LABEL[a.status]} · 이용자 ${a.participantCount}명, 동반 ${a.companionCount}명`}
                  >
                    <span className="w-[42px] shrink-0 text-[13px] font-bold text-gray-900">
                      {a.participantCount + a.companionCount}명
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-gray-700">
                      {a.organizationName}
                      {a.status !== 'CONFIRMED' && (
                        <span className="pl-1 text-xs text-gray-400">({HOST_APPLICATION_STATUS_LABEL[a.status]})</span>
                      )}
                    </span>
                    <span className="max-w-[110px] shrink-0 truncate text-xs text-gray-500">{a.transport || '미정'}</span>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function NeedRow({
  item,
  busy,
  onToggleAll,
  onCycle,
}: {
  item: NeedItem
  busy: Set<number>
  onToggleAll: () => void
  onCycle: (row: Breakdown) => void
}) {
  const anyBusy = item.breakdown.some((b) => busy.has(b.applicationSupportId))
  const notes = item.hostNotes.join(' · ')
  return (
    <div className="flex items-center gap-3.5 rounded-xl bg-gray-50 px-4 py-3.5">
      <PrepCheckbox
        checked={item.prepStatus === 'READY'}
        disabled={anyBusy}
        label={`${item.label} 모두 준비함`}
        onToggle={onToggleAll}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-bold text-gray-900">
          {item.label} {item.totalQuantity}명
          {item.prepStatus === 'CHECK' && <span className="pl-1.5 text-xs font-medium text-amber-500">확인 필요</span>}
        </p>
        <p className={cn('truncate text-xs', notes ? 'text-gray-500' : 'text-gray-400')}>
          {notes || `${item.breakdown.length}곳에서 요청했어요`}
        </p>
      </div>
      <div className="flex max-w-[50%] shrink-0 flex-wrap justify-end gap-1">
        {item.breakdown.map((b) => (
          <button
            key={b.applicationSupportId}
            type="button"
            disabled={busy.has(b.applicationSupportId)}
            onClick={() => onCycle(b)}
            title={`${b.organizationName}${b.groupName ? ` ${b.groupName}` : ''} · ${PREP_STATUS_LABEL[b.prepStatus]} (눌러서 바꾸기)`}
            className={cn(
              'inline-flex h-6 max-w-[160px] items-center gap-1 rounded-md px-2 text-xs font-medium whitespace-nowrap disabled:opacity-60',
              CHIP_TONE[b.prepStatus],
            )}
          >
            <span className="truncate">{b.organizationName}</span>
            <span className="shrink-0">{b.quantity}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
