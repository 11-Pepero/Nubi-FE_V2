// 08 프로그램 신청 준비
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applicationApi, carePersonApi, organizationApi, programApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { ApplyMethod, Group, MyApplicationDetail, PreparedApplication, ProgramDetail } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Button, ErrorState, LoadingState, Textarea, useToast } from '@/components/ui'
import { APPLY_METHOD_LABEL , applyMethodLabel } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { cn, dDay, formatDateTime, parseDate, supportText } from '@/lib/format'
import { useSelectedGroup } from '@/lib/selectedGroup'
import { ProgramPicker } from './components/ProgramPicker'
import { AiDocStatus, PdfButton } from './components/AiDocStatus'
import { useApplicationDocuments } from './components/useApplicationDocuments'
import iconBack from '@/assets/icons/applications-back.svg'
import iconChevron from '@/assets/icons/prepare-chevron-down.svg'
import iconSparkle from '@/assets/icons/prepare-sparkle.svg'
import iconPhone from '@/assets/icons/prepare-phone.svg'

type Channel = Exclude<ApplyMethod, 'DIRECT'>
const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'PHONE', label: '전화' },
  { value: 'ONLINE', label: '온라인' },
  { value: 'PAPER', label: '서면' },
]

export default function PreparePage() {
  const [params, setParams] = useSearchParams()
  const { groups, selectedGroup, selectGroup } = useSelectedGroup()
  const programId = Number(params.get('programId')) || null
  const groupParam = Number(params.get('groupId')) || null

  // 주소에 groupId가 있으면 그 그룹을 고릅니다.
  useEffect(() => {
    if (groupParam && groups.some((g) => g.id === groupParam) && selectedGroup?.id !== groupParam) selectGroup(groupParam)
  }, [groupParam, groups, selectedGroup?.id, selectGroup])

  if (!programId) {
    return (
      <ProgramPicker
        onPick={(id) => setParams(selectedGroup ? { programId: String(id), groupId: String(selectedGroup.id) } : { programId: String(id) })}
      />
    )
  }
  return <PrepareProgram key={programId} programId={programId} />
}

function PrepareProgram({ programId }: { programId: number }) {
  const navigate = useNavigate()
  const { selectedGroup } = useSelectedGroup()
  const detail = useQuery({
    queryKey: qk.program(programId, selectedGroup?.id),
    queryFn: () => programApi.detail(programId, selectedGroup?.id),
  })

  if (detail.isLoading) return <LoadingState />
  if (detail.error || !detail.data) return <ErrorState error={detail.error ?? new Error('프로그램을 찾을 수 없어요.')} onRetry={detail.refetch} />
  const program = detail.data

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full items-center gap-2.5 pb-4">
        <button aria-label="뒤로" className="size-[22px] shrink-0" onClick={() => navigate(-1)}>
          <img src={iconBack} alt="" className="size-[22px]" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-[13px] font-medium text-gray-500">
            {[program.hostName, applyMethodLabel(program.applyMethod)].filter(Boolean).join(' · ')}
          </p>
          <h1 className="truncate text-[26px] font-bold text-gray-900">{program.title}</h1>
        </div>
        <Button variant="outline" onClick={() => navigate(`/app/programs/${program.programId}`)}>
          원문 보기
        </Button>
      </div>
      {selectedGroup ? (
        <PrepareBody key={selectedGroup.id} program={program} group={selectedGroup} />
      ) : (
        <div className="rounded-2xl bg-gray-50 px-6 py-10 text-center text-[13.5px] text-gray-500">
          함께 갈 참여 그룹이 없어요. 지원 관리에서 그룹을 먼저 만들어 주세요.
        </div>
      )}
    </div>
  )
}

/** 동반 인력 비율("1:2" = 1명당 2명)이 있으면 기본 동반 인원을 계산합니다. */
function defaultCompanions(group: Group): number {
  const companion = group.supports.find((s) => s.category === 'COMPANION' && s.ratio)
  if (companion?.ratio) {
    const [per, count] = companion.ratio.split(':').map(Number)
    if (per > 0 && count > 0) return Math.ceil(group.memberCount / per) * count
  }
  return group.supports.find((s) => s.category === 'COMPANION' && s.quantity)?.quantity ?? 0
}

function monthDay(value: string | null | undefined) {
  const d = parseDate(value)
  return d ? `${d.getMonth() + 1}월 ${d.getDate()}일` : ''
}

function PrepareBody({ program, group }: { program: ProgramDetail; group: Group }) {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { auth } = useAuth()
  const { groups, selectGroup } = useSelectedGroup()
  const isDirect = program.applyMethod === 'DIRECT'

  const [participantCount, setParticipantCount] = useState(group.memberCount)
  const [companionCount, setCompanionCount] = useState(() => defaultCompanions(group))
  const [careIds, setCareIds] = useState<number[]>([])
  const [transport, setTransport] = useState('')
  const [message, setMessage] = useState('')
  const [prepared, setPrepared] = useState<PreparedApplication | null>(null)
  const [now] = useState(() => Date.now())
  const [channel, setChannel] = useState<Channel>(isDirect ? 'PHONE' : (program.applyMethod as Channel))

  const me = useQuery({ queryKey: qk.me, queryFn: organizationApi.me })
  const cares = useQuery({ queryKey: qk.carePersons({ groupId: group.id }), queryFn: () => carePersonApi.list({ groupId: group.id }) })
  const eligibility = useQuery({
    queryKey: qk.eligibility(program.programId, group.id, careIds),
    queryFn: () => programApi.eligibility(program.programId, group.id, careIds.length ? careIds : undefined),
  })

  // 이미 준비 중인 신청이 있으면("신청서 이어 쓰기") 그 신청을 이어서 씁니다.
  const preparingParams = { status: ['PREPARING' as const], size: 100 }
  const preparing = useQuery({
    queryKey: qk.myApplications(preparingParams),
    queryFn: () => applicationApi.list(preparingParams),
    enabled: !isDirect,
  })
  const existingId = preparing.data?.content.find((a) => a.programId === program.programId && a.groupName === group.name)?.applicationId
  const existing = useQuery({
    queryKey: qk.myApplication(existingId ?? 0),
    queryFn: () => applicationApi.get(existingId!),
    enabled: !!existingId && !prepared,
  })
  const current: Pick<MyApplicationDetail, 'applicationId' | 'participantCount' | 'companionCount' | 'cares'> | null =
    prepared?.application ?? existing.data ?? null
  // 신청이 생기면(준비 시작 또는 이어 쓰기) AI가 신청서·문의 문자·통화 대본을 써요.
  const ai = useApplicationDocuments(isDirect ? null : (current?.applicationId ?? null))

  const prepare = useMutation({
    mutationFn: () =>
      applicationApi.prepare({
        programId: program.programId,
        groupId: group.id,
        careIds: careIds.length ? careIds : undefined,
        participantCount,
        companionCount,
      }),
    onSuccess: (res) => {
      setPrepared(res)
      if (res.channel.applyMethod !== 'DIRECT') setChannel(res.channel.applyMethod)
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.show('신청 준비를 시작했어요. 접수한 뒤 완료로 표시해 주세요.')
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  const submit = useMutation({
    mutationFn: () => applicationApi.markSubmitted(current!.applicationId, { channel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.show('접수 완료로 표시했어요')
      navigate('/app/applications')
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  const direct = useMutation({
    mutationFn: () =>
      applicationApi.applyDirect(program.programId, {
        groupId: group.id,
        careIds: careIds.length ? careIds : undefined,
        participantCount,
        companionCount,
        transport: transport.trim() || undefined,
        message: message.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.show('신청했어요. 주최 기관이 확인하면 알려 드릴게요.')
      navigate('/app/applications')
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  // 접수처 정보: 방금 준비했으면 응답의 channel, 아니면 프로그램 정보
  const info = prepared?.channel ?? {
    applyMethod: program.applyMethod,
    hostName: program.hostName,
    contactPhone: program.contactPhone,
    applyUrl: program.applyUrl,
    deadlineAt: program.deadlineAt,
  }

  const locked = !!current
  const people = current ? { p: current.participantCount, c: current.companionCount } : { p: participantCount, c: companionCount }
  const reasons = eligibility.data?.reasons
  const askItems = useMemo(() => {
    const items = (reasons?.items ?? []).filter((i) => i.result === 'MISSING' || i.result === 'UNKNOWN').map((i) => supportText(i))
    const careAsks = (reasons?.careChecks ?? [])
      .filter((c) => c.result === 'MISSING' || c.result === 'UNKNOWN')
      .map((c) => `${c.alias} · ${c.label ?? c.content ?? ''}`)
    return [...items, ...careAsks]
  }, [reasons])
  const orgName = me.data?.name ?? auth?.organizationName ?? ''
  const contactName = me.data?.member.name ?? ''
  const contactPhone = me.data?.member.phone ?? me.data?.phone ?? null
  const selectedCares = (cares.data ?? []).filter((c) => careIds.includes(c.id))
  const careNotes = current
    ? current.cares.map((c) => `${c.alias}${c.content ? `: ${c.content.replace(/\n/g, ', ')}` : ''}`)
    : selectedCares.map((c) => `${c.alias}${c.items.length ? `: ${c.items.map((i) => i.label ?? i.content).filter(Boolean).join(', ')}` : ''}`)

  const date = monthDay(program.startAt)
  const total = people.p + people.c
  const askText = askItems.length ? ` ${askItems.join(', ')} 지원이 가능한지 여쭤봐도 될까요?` : ''
  const script = `${date} ${program.title}에 ${total}명 신청하려고 해요.${askText}`
  const sms =
    `안녕하세요, ${orgName}예요. ${date} ${program.title}에 이용자 ${people.p}명` +
    (people.c ? `과 동반 ${people.c}명이` : '이') +
    ` 함께 가려고 해요.` +
    (askItems.length ? ` ${askItems.join(', ')} 지원이 가능한지 알려 주실 수 있을까요?` : ' 신청 방법을 알려 주실 수 있을까요?')

  const formText = [
    '프로그램 참가 신청서',
    `프로그램: ${program.title} (${formatDateTime(program.startAt)})`,
    `신청 기관: ${orgName}`,
    `담당자: ${contactName}${contactPhone ? ` ${contactPhone}` : ''}`,
    `참가 인원: 이용자 ${people.p}명, 동반 인력 ${people.c}명 (총 ${total}명)`,
    `필요한 지원: ${group.supports.map((s) => supportText(s)).join(', ') || '없음'}`,
    careNotes.length ? `개별 케어: ${careNotes.join(' / ')}` : null,
    `미리 여쭐 점: ${askItems.length ? askItems.join(', ') : '없음'}`,
  ]
    .filter(Boolean)
    .join('\n')

  // AI가 쓴 서류가 있으면 그 내용을, 없거나 실패하면 위의 기본 문구를 씁니다.
  const scriptText = ai.callScript?.content ?? script
  const smsText = ai.inquiry?.content ?? sms
  const formCopyText = ai.form?.content ?? formText
  const aiFormBody = ai.form ? stripTitle(ai.form.content, '프로그램 참가 신청서') : null

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.show('복사했어요')
    } catch {
      toast.show('복사하지 못했어요', { tone: 'error' })
    }
  }

  const ownProgram = program.hostOrganizationId != null && program.hostOrganizationId === auth?.organizationId
  const deadlinePassed = (parseDate(program.deadlineAt)?.getTime() ?? Infinity) < now
  const blockReason = ownProgram
    ? '우리 기관이 연 행사예요.'
    : program.status !== 'OPEN'
      ? '지금은 신청을 받지 않는 프로그램이에요.'
      : deadlinePassed
        ? '신청 마감이 지났어요.'
        : null
  const deadline = dDay(info.deadlineAt)

  return (
    <div className="flex w-full items-start gap-6">
      {/* 왼쪽 */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <section className="flex flex-col gap-3 rounded-2xl bg-gray-50 px-6 py-5">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-[15px] font-bold text-gray-900">함께 가는 사람</h2>
            <label className="relative flex h-[34px] items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white pr-2.5 pl-3">
              <span className="text-[13px] font-medium whitespace-nowrap text-gray-700">
                {group.name} · {people.c ? `${people.p}명 + 동반 ${people.c}명` : `${people.p}명`}
              </span>
              <img src={iconChevron} alt="" className="size-3.5" />
              <select
                aria-label="참여 그룹"
                value={group.id}
                disabled={locked}
                onChange={(e) => selectGroup(Number(e.target.value))}
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} · {g.memberCount}명
                  </option>
                ))}
              </select>
            </label>
          </div>

          {eligibility.isLoading ? (
            <p className="text-xs text-gray-400">조건을 확인하는 중이에요</p>
          ) : ai.docs && ai.docs.confirmed.length + ai.docs.toAsk.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {ai.docs.confirmed.map((text, idx) => (
                <span key={`c-${idx}`} className="flex h-[26px] items-center rounded-[7px] bg-brand-soft px-2 text-xs font-medium text-brand">
                  공고에 있어요 · {text}
                </span>
              ))}
              {ai.docs.toAsk.map((text, idx) => (
                <span key={`a-${idx}`} className="flex h-[26px] items-center rounded-[7px] bg-amber-50 px-2 text-xs font-medium text-amber-500">
                  물어봐야 해요 · {text}
                </span>
              ))}
              {reasons?.capacityExceeded && (
                <span className="flex h-[26px] items-center rounded-[7px] bg-red-50 px-2 text-xs font-medium text-red-500">정원을 넘어요</span>
              )}
            </div>
          ) : reasons ? (
            <div className="flex flex-wrap gap-1.5">
              {reasons.items.map((i) => (
                <span
                  key={i.supportTagId}
                  className={cn(
                    'flex h-[26px] items-center rounded-[7px] px-2 text-xs font-medium',
                    i.result === 'MET' || i.result === 'NOTE' ? 'bg-brand-soft text-brand' : 'bg-amber-50 text-amber-500',
                  )}
                >
                  {i.result === 'MET' || i.result === 'NOTE' ? '공고에 있어요' : '물어봐야 해요'} · {supportText(i)}
                </span>
              ))}
              {reasons.careChecks
                .filter((c) => c.result !== 'MET')
                .map((c, idx) => (
                  <span key={`${c.careId}-${idx}`} className="flex h-[26px] items-center rounded-[7px] bg-amber-50 px-2 text-xs font-medium text-amber-500">
                    물어봐야 해요 · {c.alias} · {c.label ?? c.content}
                  </span>
                ))}
              {reasons.capacityExceeded && (
                <span className="flex h-[26px] items-center rounded-[7px] bg-red-50 px-2 text-xs font-medium text-red-500">정원을 넘어요</span>
              )}
            </div>
          ) : null}

          {!locked && (
            <div className="flex flex-col gap-3 border-t border-gray-200 pt-3">
              <div className="flex gap-3">
                <NumberField label="이용자" value={participantCount} onChange={setParticipantCount} min={1} />
                <NumberField label="동반 인력" value={companionCount} onChange={setCompanionCount} min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[12.5px] font-medium text-gray-500">개별 케어가 필요한 분 (선택)</p>
                {cares.isLoading ? (
                  <p className="text-xs text-gray-400">불러오는 중이에요</p>
                ) : !cares.data?.length ? (
                  <p className="text-xs text-gray-400">이 그룹에 등록된 개별 케어가 없어요.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {cares.data.map((c) => {
                      const on = careIds.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          onClick={() => setCareIds((prev) => (on ? prev.filter((x) => x !== c.id) : [...prev, c.id]))}
                          className={cn(
                            'h-8 rounded-2xl border px-3 text-[13px] font-medium',
                            on ? 'border-brand bg-brand-soft text-brand' : 'border-gray-200 bg-white text-gray-600',
                          )}
                        >
                          {c.alias}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <img src={iconSparkle} alt="" className="size-4" />
            <h2 className="flex-1 text-[15px] font-bold text-gray-900">{ai.form ? 'AI가 쓴 신청서' : '자동으로 채운 신청서'}</h2>
            {current && !isDirect && (
              <button className="text-[12.5px] font-medium text-gray-500 disabled:text-gray-300" disabled={ai.writing} onClick={ai.rewrite}>
                다시 쓰기
              </button>
            )}
            {ai.form && <PdfButton doc={ai.form} onDownload={ai.downloadPdf} downloadingId={ai.downloadingId} />}
            <button className="text-[12.5px] font-medium text-brand" onClick={() => copy(formCopyText)}>
              복사하기
            </button>
          </div>
          {!isDirect && <AiDocStatus started={!!current} writing={ai.writing} failed={ai.failed} aiWritten={ai.docs?.aiWritten ?? null} />}
          <div className={cn('flex flex-col rounded-lg border border-gray-200 bg-white px-8 py-7 transition-opacity', ai.writing && 'opacity-50')}>
            <p className="text-center text-[18px] font-bold text-gray-900">프로그램 참가 신청서</p>
            <div className="h-[18px]" />
            {aiFormBody != null ? (
              <p className="text-[13.5px] leading-[1.7] whitespace-pre-line text-gray-900">{aiFormBody}</p>
            ) : (
              <>
                <FormRow label="신청 기관" first>
                  {orgName}
                </FormRow>
                <FormRow label="담당자">
                  <span className="flex items-center gap-1.5">
                    {contactName}
                    {contactPhone ? (
                      <span>{contactPhone}</span>
                    ) : (
                      <span className="rounded bg-brand-soft px-1.5 font-medium text-brand">[직접 입력: 연락처]</span>
                    )}
                  </span>
                </FormRow>
                <FormRow label="참가 인원">
                  이용자 {people.p}명, 동반 인력 {people.c}명 (총 {total}명)
                </FormRow>
                <FormRow label="필요한 지원">{group.supports.map((s) => supportText(s)).join(', ') || '없음'}</FormRow>
                {careNotes.length > 0 && <FormRow label="개별 케어">{careNotes.join(' / ')}</FormRow>}
                <FormRow label="미리 여쭐 점">{askItems.length ? `${askItems.join(', ')} 지원이 가능한지 확인 부탁드려요.` : '없음'}</FormRow>
              </>
            )}
          </div>
        </section>
      </div>

      {/* 오른쪽 */}
      <div className="flex w-[380px] shrink-0 flex-col gap-4">
        {isDirect ? (
          <section className="flex flex-col gap-3 rounded-2xl bg-gray-50 px-5 py-[18px]">
            <h2 className="text-[15px] font-bold text-gray-900">앱에서 바로 신청</h2>
            <p className="text-[13px] leading-[1.6] text-gray-600">
              {info.hostName ?? '주최 기관'}이 이 앱에서 신청을 받아요. 보내면 주최 기관이 확인한 뒤 알려 드려요.
              {deadline && ` 마감 ${formatDateTime(info.deadlineAt)} (${deadline})`}
            </p>
            <input
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              placeholder="이동 수단 (예: 기관 차량 1대)"
              className="h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-[13.5px] outline-none focus:border-brand"
            />
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="주최 기관에 남길 말 (선택)"
              className="min-h-20 text-[13.5px]"
            />
          </section>
        ) : (
          <>
            <section className="flex flex-col gap-3 rounded-2xl bg-gray-50 px-5 py-[18px]">
              <h2 className="text-[15px] font-bold text-gray-900">접수하는 곳</h2>
              <div role="tablist" className="flex w-full gap-0.5 rounded-[10px] bg-gray-200 p-[3px]">
                {CHANNELS.map((c) => (
                  <button
                    key={c.value}
                    role="tab"
                    aria-selected={channel === c.value}
                    onClick={() => setChannel(c.value)}
                    className={cn(
                      'h-[30px] flex-1 rounded-lg text-[12.5px] font-medium',
                      channel === c.value ? 'bg-white text-gray-900' : 'text-gray-500',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {channel === 'ONLINE' ? (
                <div className="flex min-h-[52px] items-center gap-2.5 rounded-xl bg-white px-3.5 py-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[12.5px] text-gray-500">{info.hostName ?? '주최 기관'} 접수 페이지</p>
                    <p className="truncate text-[13.5px] font-medium text-gray-900">{info.applyUrl ?? '공고에 접수 링크가 없어요'}</p>
                  </div>
                  {info.applyUrl && (
                    <a href={info.applyUrl} target="_blank" rel="noreferrer" className="shrink-0 text-[12.5px] font-medium text-brand">
                      열기
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex h-[52px] items-center gap-2.5 rounded-xl bg-white px-3.5">
                  <img src={iconPhone} alt="" className="size-[18px]" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-[12.5px] text-gray-500">
                      {info.hostName ?? '주최 기관'}
                      {channel === 'PAPER' ? ' · 서면 제출 문의' : ''}
                    </p>
                    {info.contactPhone ? (
                      <a href={`tel:${info.contactPhone}`} className="text-[15px] font-bold text-gray-900">
                        {info.contactPhone}
                      </a>
                    ) : (
                      <p className="text-[13.5px] text-gray-400">공고에 연락처가 없어요</p>
                    )}
                  </div>
                </div>
              )}
              {deadline && (
                <p className="text-xs text-gray-500">
                  신청 마감 {formatDateTime(info.deadlineAt)} · <span className="font-bold text-brand">{deadline}</span>
                </p>
              )}
              <div className="flex flex-col gap-1.5 rounded-xl bg-white px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-[12.5px] font-medium text-gray-500">{channel === 'PHONE' ? '통화할 때 이렇게 말해요' : '접수할 때 이렇게 적어요'}</p>
                  {ai.writing && <span aria-label="AI가 쓰는 중" className="inline-block size-3.5 animate-spin rounded-full border-2 border-gray-300 border-r-transparent" />}
                  {ai.callScript && <PdfButton doc={ai.callScript} onDownload={ai.downloadPdf} downloadingId={ai.downloadingId} />}
                </div>
                <p className={cn('text-[13.5px] leading-[1.6] whitespace-pre-line text-gray-900', ai.writing && 'opacity-50')}>{scriptText}</p>
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-2xl bg-gray-50 px-5 py-[18px]">
              <div className="flex items-center gap-1.5">
                <img src={iconSparkle} alt="" className="size-4" />
                <h2 className="flex-1 text-[15px] font-bold text-gray-900">문의 문자</h2>
                {ai.writing && <span aria-label="AI가 쓰는 중" className="inline-block size-3.5 animate-spin rounded-full border-2 border-gray-300 border-r-transparent" />}
                {ai.inquiry && <PdfButton doc={ai.inquiry} onDownload={ai.downloadPdf} downloadingId={ai.downloadingId} />}
              </div>
              <div className={cn('rounded-xl bg-white px-3.5 py-3', ai.writing && 'opacity-50')}>
                <p className="text-[13.5px] leading-[1.6] whitespace-pre-line text-gray-700">{smsText}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="h-[34px] flex-1 rounded-[17px]" onClick={() => copy(smsText)}>
                  복사하기
                </Button>
                <a
                  href={info.contactPhone ? `sms:${info.contactPhone}?body=${encodeURIComponent(smsText)}` : undefined}
                  aria-disabled={!info.contactPhone}
                  className={cn(
                    'flex h-[34px] flex-1 items-center justify-center rounded-[17px] border border-gray-200 bg-white text-[13px] font-medium',
                    info.contactPhone ? 'text-gray-700 hover:bg-gray-50' : 'pointer-events-none text-gray-400',
                  )}
                >
                  문자로 보내기
                </a>
              </div>
            </section>
          </>
        )}

        {blockReason && !current ? (
          <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-[13px] text-gray-700">{blockReason}</p>
        ) : null}

        {isDirect ? (
          <Button className="h-11 w-full rounded-[22px]" disabled={!!blockReason} loading={direct.isPending} onClick={() => direct.mutate()}>
            바로 신청하기
          </Button>
        ) : current ? (
          <Button className="h-11 w-full rounded-[22px]" loading={submit.isPending} onClick={() => submit.mutate()}>
            접수했어요, 완료로 표시
          </Button>
        ) : (
          <Button
            className="h-11 w-full rounded-[22px]"
            disabled={!!blockReason || preparing.isLoading}
            loading={prepare.isPending}
            onClick={() => prepare.mutate()}
          >
            신청 준비 시작하기
          </Button>
        )}
        {!isDirect && (
          <p className="text-center text-xs text-gray-500">
            {current ? `${APPLY_METHOD_LABEL[channel]}로 접수한 뒤 눌러 주세요.` : '준비를 시작하면 신청 현황에 "준비 중"으로 남아요.'}
          </p>
        )}
      </div>
    </div>
  )
}

/** AI 신청서 첫 줄이 제목이면 카드 제목과 겹치지 않게 뺍니다. */
function stripTitle(content: string, title: string) {
  const lines = content.trim().split('\n')
  return lines[0]?.trim().replace(/^#+\s*/, '') === title ? lines.slice(1).join('\n').trim() : content.trim()
}

function FormRow({ label, first, children }: { label: string; first?: boolean; children: ReactNode }) {
  return (
    <div className={cn('flex items-start gap-4 py-3', !first && 'border-t border-gray-200')}>
      <p className="w-24 shrink-0 text-[13px] font-medium text-gray-500">{label}</p>
      <div className="min-w-0 flex-1 text-[13.5px] text-gray-900">{children}</div>
    </div>
  )
}

function NumberField({ label, value, onChange, min }: { label: string; value: number; onChange: (n: number) => void; min: number }) {
  return (
    <label className="flex items-center gap-2 rounded-xl bg-white py-1.5 pr-1.5 pl-3.5">
      <span className="text-[13px] font-medium text-gray-700">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className="h-8 w-16 rounded-lg border border-gray-200 px-2 text-right text-[13.5px] outline-none focus:border-brand"
      />
      <span className="text-[13px] text-gray-500">명</span>
    </label>
  )
}
