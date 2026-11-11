import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groupApi, supportTagApi } from '@/api/endpoints'
import type { Group, GroupRequest, SupportTag } from '@/api/types'
import { Button, ErrorState, Field, Input, LoadingState, Modal, useToast } from '@/components/ui'
import { cn } from '@/lib/format'
import { qk } from '@/lib/queryKeys'
import { invalidateSupport, mutationErrorMessage, sortCategoryGroups } from './shared'

type Mode = 'none' | 'quantity' | 'ratio'

interface SupportDraft {
  supportTagId: number
  label: string
  mode: Mode
  quantity: string
  ratioA: string
  ratioB: string
  note: string
}

const MODES: { value: Mode; label: string }[] = [
  { value: 'none', label: '전원' },
  { value: 'quantity', label: '인원' },
  { value: 'ratio', label: '비율' },
]

function initialDrafts(group: Group | null): SupportDraft[] {
  return (group?.supports ?? []).map((s) => {
    const [a = '1', b = '2'] = s.ratio?.split(':') ?? []
    return {
      supportTagId: s.supportTagId,
      label: s.label,
      mode: s.ratio ? 'ratio' : s.quantity ? 'quantity' : 'none',
      quantity: s.quantity ? String(s.quantity) : '',
      ratioA: a,
      ratioB: b,
      note: s.note ?? '',
    }
  })
}

const isPositiveInt = (v: string) => /^[1-9]\d*$/.test(v.trim())

/** 공통 지원 그룹 만들기 / 수정 (삭제 포함). */
export function GroupFormModal({ group, onClose }: { group: Group | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const tagsQuery = useQuery({ queryKey: qk.supportTags, queryFn: () => supportTagApi.list() })

  const [name, setName] = useState(group?.name ?? '')
  const [memberCount, setMemberCount] = useState(group ? String(group.memberCount) : '')
  const [drafts, setDrafts] = useState<SupportDraft[]>(() => initialDrafts(group))
  const [submitted, setSubmitted] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const selectedIds = useMemo(() => new Set(drafts.map((d) => d.supportTagId)), [drafts])

  const toggleTag = (tag: SupportTag) =>
    setDrafts((prev) =>
      prev.some((d) => d.supportTagId === tag.id)
        ? prev.filter((d) => d.supportTagId !== tag.id)
        : [...prev, { supportTagId: tag.id, label: tag.label, mode: 'none', quantity: '', ratioA: '1', ratioB: '2', note: '' }],
    )
  const patch = (id: number, p: Partial<SupportDraft>) =>
    setDrafts((prev) => prev.map((d) => (d.supportTagId === id ? { ...d, ...p } : d)))

  const nameError = !name.trim() ? '그룹 이름을 적어 주세요.' : name.trim().length > 50 ? '50자 이내로 적어 주세요.' : null
  const memberError =
    !isPositiveInt(memberCount) || Number(memberCount) > 1000 ? '1명에서 1000명 사이로 적어 주세요.' : null
  const draftError = (d: SupportDraft) => {
    if (d.mode === 'quantity' && !isPositiveInt(d.quantity)) return '인원을 1명 이상으로 적어 주세요.'
    if (d.mode === 'ratio' && (!isPositiveInt(d.ratioA) || !isPositiveInt(d.ratioB))) return '비율은 1 이상의 숫자로 적어 주세요.'
    if (d.note.length > 200) return '메모는 200자 이내로 적어 주세요.'
    return null
  }
  const hasError = !!nameError || !!memberError || drafts.some((d) => draftError(d))

  const saveMutation = useMutation({
    mutationFn: (body: GroupRequest) => (group ? groupApi.update(group.id, body) : groupApi.create(body)),
    onSuccess: async () => {
      await invalidateSupport(queryClient)
      toast.show(group ? '그룹을 고쳤어요.' : '그룹을 만들었어요.')
      onClose()
    },
    onError: (e) => toast.show(mutationErrorMessage(e, '이 그룹을 고칠 권한이 없어요.'), { tone: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => groupApi.remove(group!.id),
    onSuccess: async () => {
      await invalidateSupport(queryClient)
      toast.show('그룹을 지웠어요.')
      onClose()
    },
    onError: (e) => {
      setConfirmDelete(false)
      toast.show(mutationErrorMessage(e, '그룹은 관리자만 지울 수 있어요.'), { tone: 'error' })
    },
  })

  const submit = () => {
    setSubmitted(true)
    if (hasError) return
    saveMutation.mutate({
      name: name.trim(),
      memberCount: Number(memberCount),
      supports: drafts.map((d) => ({
        supportTagId: d.supportTagId,
        quantity: d.mode === 'quantity' ? Number(d.quantity) : null,
        ratio: d.mode === 'ratio' ? `${Number(d.ratioA)}:${Number(d.ratioB)}` : null,
        note: d.note.trim() || null,
      })),
    })
  }

  const busy = saveMutation.isPending || deleteMutation.isPending

  return (
    <Modal
      open
      onClose={onClose}
      width={640}
      title={group ? '공통 지원 그룹 수정' : '공통 지원 그룹 만들기'}
      footer={
        <>
          {group && (
            <Button
              variant="danger"
              className="mr-auto"
              loading={deleteMutation.isPending}
              disabled={saveMutation.isPending}
              onClick={() => (confirmDelete ? deleteMutation.mutate() : setConfirmDelete(true))}
            >
              {confirmDelete ? '한 번 더 누르면 지워요' : '그룹 삭제'}
            </Button>
          )}
          <Button variant="soft" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button onClick={submit} loading={saveMutation.isPending} disabled={deleteMutation.isPending}>
            {group ? '저장' : '만들기'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex gap-3">
          <Field label="그룹 이름" error={submitted ? nameError : null} className="min-w-0 flex-1">
            <Input value={name} maxLength={50} placeholder="예: 주간활동 A" onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="인원" error={submitted ? memberError : null} className="w-36 shrink-0">
            <Input
              type="number"
              min={1}
              max={1000}
              inputMode="numeric"
              value={memberCount}
              placeholder="명"
              onChange={(e) => setMemberCount(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold text-gray-900">공통 지원</span>
          <p className="text-xs text-gray-500">그룹에서 필요한 지원을 고르고, 몇 명이 필요한지 적어요. 이름과 진단명은 적지 않아요.</p>
          {tagsQuery.isLoading ? (
            <LoadingState className="py-6" />
          ) : tagsQuery.isError ? (
            <ErrorState error={tagsQuery.error} onRetry={() => tagsQuery.refetch()} className="py-6" />
          ) : (
            <div className="flex flex-col gap-2.5 rounded-xl bg-gray-50 p-4">
              {sortCategoryGroups(tagsQuery.data ?? []).map((cat) => (
                <div key={cat.category} className="flex items-start gap-1.5">
                  <span className="w-16 shrink-0 pt-1.5 text-[12.5px] font-medium text-gray-500">{cat.label}</span>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {cat.tags.map((tag) => {
                      const on = selectedIds.has(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            'h-8 rounded-2xl border px-3 text-[13px] font-medium',
                            on ? 'border-brand bg-brand-soft text-brand' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                          )}
                        >
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {drafts.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-bold text-gray-900">고른 지원 {drafts.length}개</span>
            {drafts.map((d) => {
              const err = submitted ? draftError(d) : null
              return (
                <div key={d.supportTagId} className="flex flex-col gap-2 rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 text-[13.5px] font-medium text-gray-900">{d.label}</span>
                    <div className="inline-flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
                      {MODES.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => patch(d.supportTagId, { mode: m.value })}
                          className={cn(
                            'h-7 rounded-md px-2.5 text-[12.5px]',
                            d.mode === m.value ? 'bg-white font-bold text-gray-900 shadow-sm' : 'font-medium text-gray-500',
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    {d.mode === 'quantity' && (
                      <span className="flex items-center gap-1 text-[13px] text-gray-600">
                        <SmallInput value={d.quantity} onChange={(v) => patch(d.supportTagId, { quantity: v })} />명
                      </span>
                    )}
                    {d.mode === 'ratio' && (
                      <span className="flex items-center gap-1 text-[13px] text-gray-600">
                        <SmallInput value={d.ratioA} onChange={(v) => patch(d.supportTagId, { ratioA: v })} />명당
                        <SmallInput value={d.ratioB} onChange={(v) => patch(d.supportTagId, { ratioB: v })} />명
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setDrafts((prev) => prev.filter((x) => x.supportTagId !== d.supportTagId))}
                      className="text-[12.5px] text-gray-400 hover:text-red-500"
                    >
                      빼기
                    </button>
                  </div>
                  <input
                    value={d.note}
                    maxLength={200}
                    onChange={(e) => patch(d.supportTagId, { note: e.target.value })}
                    placeholder="메모 (선택)"
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-[13px] outline-none placeholder:text-gray-400 focus:border-brand"
                  />
                  {err && <span className="text-xs text-red-500">{err}</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

function SmallInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      min={1}
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-14 rounded-lg border border-gray-200 px-2 text-center text-[13px] outline-none focus:border-brand"
    />
  )
}
