import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applicationApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { MyApplicationDetail } from '@/api/types'
import { Button, Chip, ErrorState, LoadingState, Modal, Textarea, useToast } from '@/components/ui'
import { APPLICATION_STATUS_LABEL, APPLY_METHOD_LABEL, PREP_STATUS_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { cn, dDay, formatDateTime, formatRange, parseDate } from '@/lib/format'
import { peopleText } from './format'
import { StepProgress } from './StepProgress'

const PREP_TONE = { PENDING: 'gray', READY: 'green', CHECK: 'amber' } as const

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 border-t border-gray-100 py-2.5 first:border-t-0">
      <span className="w-20 shrink-0 text-[13px] font-medium text-gray-500">{label}</span>
      <div className="min-w-0 flex-1 text-[13.5px] text-gray-900">{children}</div>
    </div>
  )
}

/** 신청 상세 (화면 05의 "참가 안내 보기" / 행 클릭): 행사 정보, 지원, 케어, 문의 메시지, 문의 보내기, 신청 취소. */
export function ApplicationDetailModal({ applicationId, onClose }: { applicationId: number | null; onClose: () => void }) {
  const open = applicationId != null
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.myApplication(applicationId ?? 0),
    queryFn: () => applicationApi.get(applicationId!),
    enabled: open,
  })

  return (
    <Modal open={open} onClose={onClose} width={600} title={data?.program.title ?? '신청 내용'}>
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data ? (
        <DetailBody detail={data} onClose={onClose} />
      ) : null}
    </Modal>
  )
}

function DetailBody({ detail, onClose }: { detail: MyApplicationDetail; onClose: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [inquiry, setInquiry] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [now] = useState(() => Date.now())
  const { program } = detail

  const refresh = (next: MyApplicationDetail) => {
    queryClient.setQueryData(qk.myApplication(detail.applicationId), next)
    queryClient.invalidateQueries({ queryKey: ['applications'] })
  }

  const send = useMutation({
    mutationFn: () => applicationApi.sendInquiry(detail.applicationId, inquiry.trim()),
    onSuccess: (next) => {
      refresh(next)
      setInquiry('')
      toast.show('문의를 보냈어요')
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  const cancel = useMutation({
    mutationFn: () => applicationApi.cancel(detail.applicationId, cancelReason.trim() || undefined),
    onSuccess: (next) => {
      refresh(next)
      setConfirmCancel(false)
      toast.show('신청을 취소했어요')
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  const submit = useMutation({
    mutationFn: () =>
      applicationApi.markSubmitted(detail.applicationId, {
        channel: program.applyMethod === 'DIRECT' ? undefined : program.applyMethod,
      }),
    onSuccess: (next) => {
      refresh(next)
      toast.show('접수 완료로 표시했어요')
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  const started = (parseDate(program.startAt)?.getTime() ?? Infinity) < now
  const finished = ['REJECTED', 'CANCELLED', 'ATTENDED'].includes(detail.status)
  const canCancel = !finished && !started
  const canMessage = detail.status !== 'CANCELLED'
  const upcoming = detail.status === 'CONFIRMED' ? dDay(program.startAt) : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <StepProgress step={detail.step} status={detail.status} />
        <div className="flex-1" />
        {upcoming && <span className="text-[12.5px] font-bold text-brand">{upcoming}</span>}
        <Chip tone={detail.status === 'CONFIRMED' ? 'brand' : detail.status === 'REJECTED' ? 'red' : 'gray'} size="sm">
          {APPLICATION_STATUS_LABEL[detail.status]}
        </Chip>
      </div>

      <section className="rounded-2xl bg-gray-50 px-5 py-3">
        <Row label="일시">{formatRange(program.startAt, program.endAt)}</Row>
        <Row label="장소">
          {program.venueName ?? '-'}
          {program.venueAddress && <span className="block text-xs text-gray-500">{program.venueAddress}</span>}
        </Row>
        <Row label="주최">{program.hostName ?? '-'}</Row>
        <Row label="접수 방법">
          {APPLY_METHOD_LABEL[program.applyMethod]}
          {program.applyUrl && (
            <a href={program.applyUrl} target="_blank" rel="noreferrer" className="ml-2 text-[12.5px] font-medium text-brand">
              접수 링크 열기
            </a>
          )}
        </Row>
        {program.contactPhone && (
          <Row label="문의 전화">
            <a href={`tel:${program.contactPhone}`} className="font-medium text-gray-900">
              {program.contactPhone}
            </a>
          </Row>
        )}
        <Row label="함께 가는 사람">
          {detail.groupName ?? '-'} · {peopleText(detail.participantCount, detail.companionCount)}
          {detail.transport && <span className="block text-xs text-gray-500">이동 수단 · {detail.transport}</span>}
        </Row>
        {detail.submittedAt && <Row label="접수한 때">{formatDateTime(detail.submittedAt)}</Row>}
      </section>

      {detail.supports.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[14px] font-bold text-gray-900">필요한 지원</h3>
          <div className="flex flex-col gap-1.5">
            {detail.supports.map((s) => (
              <div key={s.applicationSupportId} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-2.5">
                <span className="flex-1 text-[13.5px] text-gray-900">
                  {s.label}
                  {s.quantity ? ` ${s.quantity}명` : ''}
                  {s.hostNote && <span className="block text-xs text-gray-500">주최 메모 · {s.hostNote}</span>}
                </span>
                <Chip tone={PREP_TONE[s.prepStatus]} size="sm">
                  {PREP_STATUS_LABEL[s.prepStatus]}
                </Chip>
              </div>
            ))}
          </div>
        </section>
      )}

      {detail.cares.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[14px] font-bold text-gray-900">개별 케어</h3>
          <div className="flex flex-col gap-1.5">
            {detail.cares.map((c, i) => (
              <div key={c.carePersonId ?? `care-${i}`} className="rounded-xl bg-gray-50 px-3.5 py-2.5">
                <p className="text-[13.5px] font-medium text-gray-900">{c.alias}</p>
                {c.content && <p className="text-xs leading-[1.6] whitespace-pre-line text-gray-500">{c.content}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-[14px] font-bold text-gray-900">문의</h3>
        {detail.messages.length === 0 ? (
          <p className="text-[13px] text-gray-500">아직 주고받은 문의가 없어요.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {detail.messages.map((m) => (
              <div
                key={m.messageId}
                className={cn(
                  'max-w-[85%] rounded-xl px-3.5 py-2.5',
                  m.fromHost ? 'self-start bg-gray-100' : 'self-end bg-brand-soft',
                )}
              >
                <p className="text-[11.5px] text-gray-500">
                  {m.senderOrganizationName} · {formatDateTime(m.createdAt)}
                </p>
                <p className="text-[13.5px] leading-[1.6] whitespace-pre-line text-gray-900">{m.body}</p>
              </div>
            ))}
          </div>
        )}
        {canMessage && (
          <div className="flex flex-col gap-2">
            <Textarea
              value={inquiry}
              onChange={(e) => setInquiry(e.target.value)}
              placeholder="주최 기관에 물어볼 점을 적어 주세요"
              className="min-h-20 text-[13.5px]"
            />
            <div className="flex justify-end">
              <Button size="sm" disabled={!inquiry.trim()} loading={send.isPending} onClick={() => send.mutate()}>
                문의 보내기
              </Button>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-4">
        {canCancel && !confirmCancel && (
          <Button variant="danger" size="sm" onClick={() => setConfirmCancel(true)}>
            신청 취소
          </Button>
        )}
        <div className="flex-1" />
        {detail.status === 'PREPARING' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                navigate(`/app/prepare?programId=${program.programId}`)
              }}
            >
              신청서 이어 쓰기
            </Button>
            {program.applyMethod !== 'DIRECT' && (
              <Button size="sm" loading={submit.isPending} onClick={() => submit.mutate()}>
                접수 완료 표시
              </Button>
            )}
          </>
        )}
        {detail.status === 'ATTENDED' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose()
              navigate(`/app/applications/${detail.applicationId}/review`)
            }}
          >
            후기 남기기
          </Button>
        )}
        <Button variant="soft" size="sm" onClick={onClose}>
          닫기
        </Button>
      </div>

      {confirmCancel && (
        <div className="flex flex-col gap-2 rounded-2xl bg-red-50 px-4 py-3">
          <p className="text-[13.5px] font-bold text-gray-900">신청을 취소할까요?</p>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="취소 사유 (선택) — 주최 기관에 함께 전달돼요"
            className="min-h-16 text-[13.5px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmCancel(false)}>
              그대로 두기
            </Button>
            <Button variant="danger" size="sm" loading={cancel.isPending} onClick={() => cancel.mutate()}>
              취소하기
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
