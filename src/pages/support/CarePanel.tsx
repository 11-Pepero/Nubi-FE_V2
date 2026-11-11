import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { carePersonApi, groupApi, supportTagApi } from '@/api/endpoints'
import type { CarePerson, CarePersonCreateRequest, EligibilityResult, JudgementImpact, SupportCategory } from '@/api/types'
import { Button, Chip, ErrorState, LoadingState, Spinner, useToast } from '@/components/ui'
import { cn, formatShortDate, supportText } from '@/lib/format'
import { ELIGIBILITY_RESULT_LABEL, ITEM_RESULT_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import closeIcon from '@/assets/icons/support-close.svg'
import chevronIcon from '@/assets/icons/support-chevron-down.svg'
import removeIcon from '@/assets/icons/support-remove.svg'
import plusIcon from '@/assets/icons/support-plus.svg'
import { invalidateSupport, mutationErrorMessage, sortCategoryGroups } from './shared'

/** 오른쪽에서 열리는 개별 케어 추가/수정 패널 (화면 02 오른쪽). careId가 있으면 수정. */
export function CarePanel({
  careId,
  defaultGroupId,
  onClose,
}: {
  careId: number | null
  defaultGroupId: number | null
  onClose: () => void
}) {
  const detailQuery = useQuery({
    queryKey: qk.carePerson(careId ?? 0),
    queryFn: () => carePersonApi.get(careId!),
    enabled: careId != null,
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end bg-black/15" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={careId ? '개별 케어 수정' : '개별 케어 추가'}
        className="flex h-full w-[420px] max-w-full flex-col border-l border-gray-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-7 pt-7 pb-[22px]">
          <h2 className="min-w-0 flex-1 text-[20px] font-bold text-gray-900">{careId ? '개별 케어 수정' : '개별 케어 추가'}</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded-md p-0.5 hover:bg-gray-100">
            <img src={closeIcon} alt="" width={20} height={20} />
          </button>
        </div>
        {careId == null ? (
          <CareForm care={null} defaultGroupId={defaultGroupId} onClose={onClose} />
        ) : detailQuery.isLoading ? (
          <LoadingState />
        ) : detailQuery.isError || !detailQuery.data ? (
          <ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} />
        ) : (
          <CareForm key={detailQuery.data.id} care={detailQuery.data} defaultGroupId={null} onClose={onClose} />
        )}
      </aside>
    </div>,
    document.body,
  )
}

interface ItemDraft {
  key: number
  supportTagId: number | null
  label: string | null
  content: string | null
}

let seq = 0

function CareForm({ care, defaultGroupId, onClose }: { care: CarePerson | null; defaultGroupId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const groupsQuery = useQuery({ queryKey: qk.groups, queryFn: groupApi.list })
  const tagsQuery = useQuery({ queryKey: qk.supportTags, queryFn: () => supportTagApi.list() })

  const [alias, setAlias] = useState(care?.alias ?? '')
  const [groupId, setGroupId] = useState<number | null>(care ? care.groupId : defaultGroupId)
  const [items, setItems] = useState<ItemDraft[]>(
    () => care?.items.map((i) => ({ key: ++seq, supportTagId: i.supportTagId, label: i.label, content: i.content })) ?? [],
  )
  const [memo, setMemo] = useState(care?.memo ?? '')
  const [apply, setApply] = useState(care?.applyToJudgement ?? true)
  const [category, setCategory] = useState<SupportCategory | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const categories = useMemo(() => sortCategoryGroups(tagsQuery.data ?? []), [tagsQuery.data])
  const activeCategory = categories.find((c) => c.category === category) ?? null
  const group = groupsQuery.data?.find((g) => g.id === groupId) ?? null
  const usedTagIds = new Set(items.map((i) => i.supportTagId).filter((v): v is number => v != null))

  const aliasError = !alias.trim() ? '별칭을 적어 주세요.' : alias.trim().length > 20 ? '20자 이내로 적어 주세요.' : null

  const addDraft = () => {
    const text = draft.trim()
    if (!text) return
    setItems((prev) => [...prev, { key: ++seq, supportTagId: null, label: null, content: text }])
    setDraft('')
  }

  const saveMutation = useMutation({
    mutationFn: (body: CarePersonCreateRequest) =>
      care
        ? carePersonApi.update(care.id, { alias: body.alias, items: body.items, memo: body.memo, applyToJudgement: body.applyToJudgement })
        : carePersonApi.create(body),
    onSuccess: async () => {
      await invalidateSupport(queryClient)
      toast.show(care ? '개별 케어를 고쳤어요.' : '명단에 추가했어요.')
      onClose()
    },
    onError: (e) => toast.show(mutationErrorMessage(e, '이 개별 케어를 고칠 권한이 없어요.'), { tone: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => carePersonApi.remove(care!.id),
    onSuccess: async () => {
      await invalidateSupport(queryClient)
      toast.show('명단에서 지웠어요.')
      onClose()
    },
    onError: (e) => {
      setConfirmDelete(false)
      toast.show(mutationErrorMessage(e, '이 개별 케어를 지울 권한이 없어요.'), { tone: 'error' })
    },
  })

  const submit = () => {
    setSubmitted(true)
    if (aliasError) return
    const pending = draft.trim()
    const all = pending ? [...items, { key: 0, supportTagId: null, label: null, content: pending }] : items
    saveMutation.mutate({
      alias: alias.trim(),
      groupId,
      items: all.map((i) => ({ supportTagId: i.supportTagId, content: i.content })),
      memo: memo.trim() || null,
      applyToJudgement: apply,
    })
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto px-7 pb-6">
        <PanelField label="별칭" error={submitted ? aliasError : null}>
          <input
            autoFocus={!care}
            value={alias}
            maxLength={20}
            placeholder="예: 햇살 (실명은 적지 않아요)"
            onChange={(e) => setAlias(e.target.value)}
            className={inputClass}
          />
        </PanelField>

        <PanelField label="소속 그룹" hint={care ? '소속 그룹은 추가할 때만 정할 수 있어요.' : undefined}>
          <div className="relative">
            <select
              value={groupId ?? ''}
              disabled={!!care}
              onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : null)}
              className={cn(inputClass, 'appearance-none pr-9 disabled:bg-gray-50 disabled:text-gray-500')}
            >
              {care ? (
                <option value={care.groupId ?? ''}>{care.groupName ?? '소속 그룹 없음'}</option>
              ) : (
                <>
                  <option value="">소속 그룹 없음</option>
                  {groupsQuery.data?.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            <img src={chevronIcon} alt="" width={14} height={14} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2" />
          </div>
        </PanelField>

        {group && (
          <div className="flex flex-col gap-2.5 rounded-xl bg-gray-50 px-3.5 pt-3 pb-3.5">
            <p className="text-[12.5px] font-medium text-gray-500">그룹에서 이어받는 공통 지원</p>
            {group.supports.length ? (
              <div className="flex flex-wrap gap-1.5">
                {group.supports.map((s) => (
                  <Chip key={s.supportTagId} tone="white">
                    {supportText(s)}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-gray-400">이 그룹에는 아직 공통 지원이 없어요.</p>
            )}
          </div>
        )}

        <PanelField label="추가로 필요한 케어" as="div">
          {tagsQuery.isLoading ? (
            <Spinner />
          ) : tagsQuery.isError ? (
            <p className="text-[12.5px] text-red-500">지원 항목을 불러오지 못했어요.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c.category}
                    type="button"
                    aria-pressed={category === c.category}
                    onClick={() => setCategory(category === c.category ? null : c.category)}
                    className={cn(
                      'h-8 rounded-2xl border px-3 text-[13px] font-medium',
                      category === c.category ? 'border-brand bg-brand-soft text-brand' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {activeCategory && (
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-100 p-2.5">
                  {activeCategory.tags.map((tag) => {
                    const used = usedTagIds.has(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        disabled={used}
                        onClick={() => setItems((prev) => [...prev, { key: ++seq, supportTagId: tag.id, label: tag.label, content: null }])}
                        className="h-7 rounded-lg bg-gray-100 px-2.5 text-[12.5px] font-medium text-gray-700 hover:bg-gray-200 disabled:bg-brand-soft disabled:text-brand"
                      >
                        {used ? `✓ ${tag.label}` : `+ ${tag.label}`}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </PanelField>

        <PanelField label="케어 항목" as="div">
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div key={item.key} className="flex h-10 items-center gap-2 rounded-xl bg-gray-50 pr-2.5 pl-3.5">
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-gray-900">
                  {item.label && item.content ? `${item.label} · ${item.content}` : (item.label ?? item.content)}
                </span>
                <button
                  type="button"
                  aria-label="항목 빼기"
                  onClick={() => setItems((prev) => prev.filter((x) => x.key !== item.key))}
                  className="rounded p-0.5 hover:bg-gray-200"
                >
                  <img src={removeIcon} alt="" width={14} height={14} />
                </button>
              </div>
            ))}
            {adding ? (
              <input
                autoFocus
                value={draft}
                maxLength={200}
                placeholder="직접 적고 Enter (예: 넓은 회전 공간 1.5m)"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    addDraft()
                  }
                }}
                onBlur={() => {
                  addDraft()
                  setAdding(false)
                }}
                className={inputClass}
              />
            ) : (
              <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 self-start pl-1 text-[13px] font-medium text-brand">
                <img src={plusIcon} alt="" width={14} height={14} />
                항목 더하기
              </button>
            )}
          </div>
        </PanelField>

        <PanelField label="메모">
          <textarea
            value={memo}
            maxLength={1000}
            rows={2}
            placeholder="함께 다닐 때 알아 둘 점"
            onChange={(e) => setMemo(e.target.value)}
            className={cn(inputClass, 'h-auto min-h-[46px] resize-y py-3 leading-[1.5]')}
          />
        </PanelField>

        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13.5px] font-medium text-gray-900">참여 판정에 반영</span>
            <span className="text-[12.5px] text-gray-500">맞지 않는 프로그램은 확인 필요로 알려요</span>
          </div>
          <Toggle checked={apply} onChange={setApply} label="참여 판정에 반영" />
        </div>

        {care?.judgementImpact && <ImpactSection impact={care.judgementImpact} />}
      </div>

      <div className="flex items-center justify-end gap-2 px-7 pb-6 pt-2">
        {care && (
          <Button
            variant="danger"
            className="mr-auto"
            loading={deleteMutation.isPending}
            disabled={saveMutation.isPending}
            onClick={() => (confirmDelete ? deleteMutation.mutate() : setConfirmDelete(true))}
          >
            {confirmDelete ? '한 번 더 누르면 지워요' : '삭제'}
          </Button>
        )}
        <Button variant="soft" onClick={onClose} disabled={saveMutation.isPending}>
          취소
        </Button>
        <Button onClick={submit} loading={saveMutation.isPending} disabled={deleteMutation.isPending}>
          {care ? '저장' : '명단에 추가'}
        </Button>
      </div>
    </>
  )
}

const inputClass =
  'h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[13.5px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand'

function PanelField({
  label,
  hint,
  error,
  as = 'label',
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  as?: 'label' | 'div'
  children: ReactNode
}) {
  const Tag = as
  return (
    <Tag className="flex w-full flex-col gap-2">
      <span className="text-[12.5px] font-medium text-gray-500">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-500">{error}</span> : hint ? <span className="text-xs text-gray-400">{hint}</span> : null}
    </Tag>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-gray-200')}
    >
      <span
        className={cn(
          'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-[left]',
          checked ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

const RESULT_TONE: Record<EligibilityResult, 'green' | 'amber' | 'red'> = { ELIGIBLE: 'green', CHECK: 'amber', NOT: 'red' }

function ImpactSection({ impact }: { impact: JudgementImpact }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-gray-50 px-3.5 pt-3 pb-3.5">
      <p className="text-[12.5px] font-medium text-gray-500">
        판정 영향{impact.applied && impact.affectedCount > 0 ? ` · 프로그램 ${impact.affectedCount}개` : ''}
      </p>
      {!impact.applied ? (
        <p className="text-[13px] text-gray-600">참여 판정에 반영하지 않고 있어요.</p>
      ) : impact.programs.length === 0 ? (
        <p className="text-[13px] text-gray-600">이 사람 때문에 판정이 달라지는 공개 중 프로그램은 없어요.</p>
      ) : (
        impact.programs.map((p) => {
          const checks = p.checks.filter((c) => c.result !== 'MET')
          return (
            <div key={p.programId} className="flex flex-col gap-1.5 rounded-lg bg-white px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-900">{p.title}</span>
                <span className="shrink-0 text-xs text-gray-400">{formatShortDate(p.startAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Chip size="sm" tone={RESULT_TONE[p.resultWithout]}>
                  {ELIGIBILITY_RESULT_LABEL[p.resultWithout]}
                </Chip>
                →
                <Chip size="sm" tone={RESULT_TONE[p.resultWith]}>
                  {ELIGIBILITY_RESULT_LABEL[p.resultWith]}
                </Chip>
              </div>
              {checks.length > 0 && (
                <ul className="flex flex-col gap-0.5 text-xs text-gray-600">
                  {checks.map((c, i) => (
                    <li key={i}>
                      {c.label ?? c.content} · {ITEM_RESULT_LABEL[c.result]}
                      {c.evidence ? <span className="text-gray-400"> ({c.evidence})</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
