// 화면 13: 신청 내용 자세히 — 목록 위에 어둡게 깔고 오른쪽 500px 패널로 엽니다.
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { ApplicationStatus, EventApplicationDetail, PrepStatus, SupportSnapshot } from '@/api/types'
import { Button, ErrorState, LoadingState, Modal, Textarea, useToast } from '@/components/ui'
import { APPLY_METHOD_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { cn, formatDateTime } from '@/lib/format'
import { PrepBadge, PrepCheckbox, StatusBadge } from './shared'
import { formatShortDateTime } from './utils'
import iconClose from '@/assets/icons/support-close.svg'

type Decision = Extract<ApplicationStatus, 'CONFIRMED' | 'WAITING' | 'REJECTED'>
const DECIDABLE_FROM: ApplicationStatus[] = ['SUBMITTED', 'INQUIRY', 'WAITING', 'CONFIRMED']

const DECISION_DONE: Record<Decision, string> = {
  CONFIRMED: '신청을 확정했어요',
  WAITING: '대기로 두었어요',
  REJECTED: '신청을 거절했어요',
}

export function ApplicationPanel({
  eventId,
  applicationId,
  onClose,
}: {
  eventId: number
  applicationId: number
  onClose: () => void
}) {
  const query = useQuery({
    queryKey: qk.eventApplication(eventId, applicationId),
    queryFn: () => eventApi.application(eventId, applicationId),
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 거절 확인 창이 위에 떠 있으면 그 창만 닫히게 둡니다.
      if (e.key === 'Escape' && document.querySelectorAll('[aria-modal="true"]').length <= 1) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="신청 내용"
        className="absolute inset-y-0 right-0 flex w-[500px] max-w-full flex-col border-l border-gray-200 bg-white shadow-[-8px_0_24px_rgba(17,24,39,0.08)]"
      >
        {query.isLoading ? (
          <LoadingState className="flex-1" />
        ) : query.isError || !query.data ? (
          <div className="flex flex-1 flex-col">
            <PanelClose onClose={onClose} />
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          </div>
        ) : (
          <PanelBody eventId={eventId} detail={query.data} onClose={onClose} />
        )}
      </aside>
    </div>,
    document.body,
  )
}

function PanelClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="닫기"
      onClick={onClose}
      className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100"
    >
      <img src={iconClose} alt="" width={20} height={20} />
    </button>
  )
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center">
        <h3 className="flex-1 text-[13.5px] font-bold text-gray-900">{title}</h3>
        {aside && <span className="text-xs font-medium text-gray-500">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function PanelBody({ eventId, detail, onClose }: { eventId: number; detail: EventApplicationDetail; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const applicationId = detail.applicationId
  const [reply, setReply] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const applyDetail = (data: EventApplicationDetail) => {
    queryClient.setQueryData(qk.eventApplication(eventId, applicationId), data)
    queryClient.invalidateQueries({ queryKey: ['events', eventId] })
    queryClient.invalidateQueries({ queryKey: qk.eventDashboard })
    queryClient.invalidateQueries({ queryKey: ['events', 'list'] })
  }
  const onError = (e: unknown) => toast.show(errorMessage(e), { tone: 'error' })

  const prep = useMutation({
    mutationFn: (v: { support: SupportSnapshot; prepStatus: PrepStatus }) =>
      eventApi.updateSupportPrep(eventId, applicationId, v.support.applicationSupportId, {
        prepStatus: v.prepStatus,
        hostNote: v.support.hostNote ?? undefined,
      }),
    onSuccess: applyDetail,
    onError,
  })

  const note = useMutation({
    mutationFn: (v: { support: SupportSnapshot; hostNote: string }) =>
      eventApi.updateSupportPrep(eventId, applicationId, v.support.applicationSupportId, {
        prepStatus: v.support.prepStatus,
        hostNote: v.hostNote,
      }),
    onSuccess: applyDetail,
    onError,
  })

  const send = useMutation({
    mutationFn: (body: string) => eventApi.reply(eventId, applicationId, body),
    onSuccess: (data) => {
      applyDetail(data)
      setReply('')
    },
    onError,
  })

  const decide = useMutation({
    mutationFn: (v: { status: Decision; reason?: string }) => eventApi.decide(eventId, applicationId, v),
    onSuccess: (data, v) => {
      applyDetail(data)
      setRejectOpen(false)
      setRejectReason('')
      toast.show(DECISION_DONE[v.status])
    },
    onError,
  })

  const canDecide = DECIDABLE_FROM.includes(detail.status)
  const canReply = detail.status !== 'CANCELLED'
  const readyCount = detail.supports.filter((s) => s.prepStatus === 'READY').length
  const contactPhone = detail.contact?.phone ?? detail.organizationPhone
  const contactName = detail.contact?.name
  const subtitle = [
    detail.groupName,
    detail.channel === 'DIRECT' ? '앱에서 바로 신청했어요' : detail.channel ? `${APPLY_METHOD_LABEL[detail.channel]}로 신청했어요` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      {/* 머리 */}
      <div className="flex shrink-0 flex-col gap-1.5 px-7 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={detail.status} />
          {detail.submittedAt && (
            <span className="text-xs text-gray-500">{formatShortDateTime(detail.submittedAt)} 신청</span>
          )}
          <PanelClose onClose={onClose} />
        </div>
        <h2 className="pt-1 text-[20px] font-bold text-gray-900">{detail.organizationName}</h2>
        {subtitle && <p className="text-[13px] text-gray-500">{subtitle}</p>}
      </div>

      {/* 본문 */}
      <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-7 pb-6">
        <Section title="담당자">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-[13.5px] font-bold text-gray-900">{contactName ?? detail.organizationName}</p>
              <p className="truncate text-xs text-gray-500">{contactPhone ?? '연락처가 없어요'}</p>
            </div>
            {contactPhone && (
              <a
                href={`sms:${contactPhone.replace(/[^0-9+]/g, '')}`}
                className="inline-flex h-8 shrink-0 items-center rounded-2xl border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
              >
                문자 보내기
              </a>
            )}
          </div>
        </Section>

        <Section title="함께 오는 사람" aside={`총 ${detail.participantCount + detail.companionCount}명`}>
          <div className="flex gap-2">
            {[
              { label: '이용자', value: `${detail.participantCount}명` },
              { label: '동반 인력', value: `${detail.companionCount}명` },
              { label: '오는 방법', value: detail.transport || '안 적었어요' },
            ].map((c) => (
              <div key={c.label} className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl bg-gray-50 px-3.5 py-2.5">
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="truncate text-[15px] font-bold text-gray-900">{c.value}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="필요한 지원" aside={detail.supports.length > 0 ? `준비 ${readyCount} / ${detail.supports.length}` : undefined}>
          {detail.supports.length === 0 ? (
            <p className="rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-gray-500">요청한 지원이 없어요</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {detail.supports.map((s) => (
                <SupportRow
                  key={s.applicationSupportId}
                  support={s}
                  busy={
                    (prep.isPending && prep.variables?.support.applicationSupportId === s.applicationSupportId) ||
                    (note.isPending && note.variables?.support.applicationSupportId === s.applicationSupportId)
                  }
                  onPrep={(prepStatus) => prep.mutate({ support: s, prepStatus })}
                  onNote={(hostNote) => note.mutate({ support: s, hostNote })}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="개별 케어" aside={`${detail.cares.length}명`}>
          {detail.cares.length === 0 ? (
            <p className="rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-gray-500">개별 케어가 없어요</p>
          ) : (
            detail.cares.map((c, i) => (
              <div key={`${c.carePersonId ?? 'x'}-${i}`} className="flex flex-col gap-1 rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-[13.5px] font-bold text-gray-900">{c.alias}</p>
                {c.content && <p className="text-[12.5px] leading-[1.5] text-gray-600">{c.content}</p>}
              </div>
            ))
          )}
        </Section>

        <Section title="남긴 말">
          {detail.messages.length === 0 && (
            <p className="rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-gray-500">아직 주고받은 말이 없어요</p>
          )}
          {detail.messages.map((m) => (
            <div
              key={m.messageId}
              className={cn('flex flex-col gap-1 rounded-xl px-4 py-3', m.fromHost ? 'ml-8 bg-brand-soft' : 'mr-8 bg-gray-50')}
            >
              <p className="text-[11.5px] text-gray-500">
                {m.fromHost ? '우리 기관' : m.senderOrganizationName} · {formatDateTime(m.createdAt)}
              </p>
              <p className="text-[13px] leading-[1.5] whitespace-pre-wrap text-gray-900">{m.body}</p>
            </div>
          ))}
          {canReply && (
            <form
              className="flex items-center gap-2 rounded-xl border border-gray-200 py-1.5 pr-1.5 pl-[15px] focus-within:border-brand"
              onSubmit={(e) => {
                e.preventDefault()
                if (reply.trim()) send.mutate(reply.trim())
              }}
            >
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="답장 쓰기"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
              />
              <Button type="submit" variant="dark" size="sm" disabled={!reply.trim()} loading={send.isPending}>
                보내기
              </Button>
            </form>
          )}
        </Section>
      </div>

      {/* 아래 결정 버튼 */}
      <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 px-7 py-[15px]">
        {canDecide ? (
          <>
            <button
              type="button"
              onClick={() => setRejectOpen(true)}
              className="text-[13px] font-medium text-gray-500 hover:text-red-500"
            >
              거절
            </button>
            <span className="flex-1" />
            <button
              type="button"
              disabled={detail.status === 'WAITING' || decide.isPending}
              onClick={() => decide.mutate({ status: 'WAITING' })}
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:text-gray-400"
            >
              대기로 두기
            </button>
            <button
              type="button"
              disabled={detail.status === 'CONFIRMED' || decide.isPending}
              onClick={() => decide.mutate({ status: 'CONFIRMED' })}
              className="h-11 rounded-xl bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-strong disabled:bg-gray-200 disabled:text-gray-400"
            >
              {detail.status === 'CONFIRMED' ? '확정됨' : '신청 확정'}
            </button>
          </>
        ) : (
          <p className="flex-1 py-3 text-[13px] text-gray-500">
            {detail.decidedAt ? `${formatDateTime(detail.decidedAt)}에 정해졌어요. ` : ''}
            지금 상태에서는 확정·대기·거절을 바꿀 수 없어요.
          </p>
        )}
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="신청을 거절할까요?"
        width={440}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              loading={decide.isPending}
              onClick={() => decide.mutate({ status: 'REJECTED', reason: rejectReason.trim() || undefined })}
            >
              거절하기
            </Button>
          </>
        }
      >
        <p className="pb-3 text-[13.5px] leading-[1.6] text-gray-600">
          {detail.organizationName}에 거절 알림이 가요. 이유를 적으면 메시지로 함께 전해져요.
        </p>
        <Textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="거절 이유 (선택)"
          maxLength={500}
        />
      </Modal>
    </>
  )
}

function SupportRow({
  support,
  busy,
  onPrep,
  onNote,
}: {
  support: SupportSnapshot
  busy: boolean
  onPrep: (next: PrepStatus) => void
  onNote: (note: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(support.hostNote ?? '')
  const title = support.quantity ? `${support.label} ${support.quantity}명` : support.label

  const save = () => {
    setEditing(false)
    if (draft.trim() !== (support.hostNote ?? '')) onNote(draft.trim())
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-[15px] py-3">
      <PrepCheckbox
        checked={support.prepStatus === 'READY'}
        disabled={busy}
        label={`${support.label} 준비함`}
        onToggle={() => onPrep(support.prepStatus === 'READY' ? 'PENDING' : 'READY')}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[13.5px] font-bold text-gray-900">{title}</p>
        {editing ? (
          <input
            autoFocus
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') {
                e.stopPropagation()
                setDraft(support.hostNote ?? '')
                setEditing(false)
              }
            }}
            placeholder="준비 메모 (예: 앞줄 통로 쪽 2석)"
            className="h-6 rounded-md border border-gray-200 px-2 text-xs text-gray-900 outline-none focus:border-brand"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(support.hostNote ?? '')
              setEditing(true)
            }}
            className={cn('truncate text-left text-xs hover:underline', support.hostNote ? 'text-gray-500' : 'text-gray-400')}
          >
            {support.hostNote || '준비 메모 남기기'}
          </button>
        )}
      </div>
      <PrepBadge status={support.prepStatus} onChange={onPrep} disabled={busy} />
    </div>
  )
}
