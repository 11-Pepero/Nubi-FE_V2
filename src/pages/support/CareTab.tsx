import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { carePersonApi, groupApi } from '@/api/endpoints'
import type { CarePerson, SupportCategory } from '@/api/types'
import { Button, Chip, EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { SUPPORT_CATEGORY_LABEL, SUPPORT_CATEGORY_ORDER } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import searchIcon from '@/assets/icons/support-search.svg'
import chevronIcon from '@/assets/icons/support-chevron-down.svg'

function itemText(item: CarePerson['items'][number]) {
  if (item.label && item.content) return `${item.label} · ${item.content}`
  return item.label ?? item.content ?? ''
}

export function CareTab({ onAdd, onEdit }: { onAdd: () => void; onEdit: (careId: number) => void }) {
  const [params, setParams] = useSearchParams()
  const groupId = params.get('groupId') ? Number(params.get('groupId')) : undefined
  const category = (params.get('category') as SupportCategory | null) ?? undefined
  const [keyword, setKeyword] = useState('')

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const groupsQuery = useQuery({ queryKey: qk.groups, queryFn: groupApi.list })
  const filters = { groupId, category }
  const listQuery = useQuery({
    queryKey: qk.carePersons(filters),
    queryFn: () => carePersonApi.list(filters),
  })

  // 별칭은 서버에서도 찾지만, 케어 내용으로도 찾을 수 있게 화면에서 거릅니다.
  const rows = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    const list = listQuery.data ?? []
    if (!q) return list
    return list.filter(
      (c) => c.alias.toLowerCase().includes(q) || c.items.some((i) => itemText(i).toLowerCase().includes(q)),
    )
  }, [listQuery.data, keyword])

  // 판정 영향(judgementImpact)은 상세에서만 내려와서 사람마다 상세를 받습니다.
  const details = useQueries({
    queries: rows.map((c) => ({
      queryKey: qk.carePerson(c.id),
      queryFn: () => carePersonApi.get(c.id),
      enabled: c.applyToJudgement,
      staleTime: 60_000,
    })),
  })

  return (
    <div className="flex w-full flex-col pb-10">
      <div className="flex w-full flex-wrap items-center gap-2 pt-6">
        <label className="flex h-11 w-[300px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 focus-within:border-brand">
          <img src={searchIcon} alt="" width={16} height={16} />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="별칭이나 케어로 찾기"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-gray-900 outline-none placeholder:text-gray-400"
          />
        </label>
        <FilterSelect
          value={groupId ? String(groupId) : ''}
          onChange={(v) => setParam('groupId', v || undefined)}
          options={[{ value: '', label: '그룹 전체' }, ...(groupsQuery.data ?? []).map((g) => ({ value: String(g.id), label: g.name }))]}
          ariaLabel="소속 그룹"
        />
        <FilterSelect
          value={category ?? ''}
          onChange={(v) => setParam('category', v || undefined)}
          options={[
            { value: '', label: '케어 종류 전체' },
            ...SUPPORT_CATEGORY_ORDER.map((c) => ({ value: c, label: SUPPORT_CATEGORY_LABEL[c] })),
          ]}
          ariaLabel="케어 종류"
        />
        <div className="flex-1" />
        {listQuery.data && <span className="text-[13px] font-medium text-gray-500">{rows.length}명</span>}
      </div>

      <div className="pt-4">
        {listQuery.isLoading ? (
          <LoadingState />
        ) : listQuery.isError ? (
          <ErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={listQuery.data?.length ? '찾는 사람이 없어요' : '개별 케어 명단이 비어 있어요'}
            description={
              listQuery.data?.length
                ? '다른 말로 찾거나 거르기를 바꿔 보세요.'
                : '공통 지원 외에 한 사람만 따로 챙길 일이 있으면 별칭으로 적어 두세요.'
            }
            action={!listQuery.data?.length ? <Button onClick={onAdd}>개별 케어 추가</Button> : undefined}
          />
        ) : (
          <div className="flex w-full flex-col rounded-2xl bg-gray-50 px-2 py-1">
            <div className="flex h-10 w-full items-center gap-3 px-4 text-xs font-medium text-gray-400">
              <span className="w-20 shrink-0">별칭</span>
              <span className="w-[90px] shrink-0">소속 그룹</span>
              <span className="min-w-0 flex-1">공통 지원 외 추가 케어</span>
              <span className="w-[120px] shrink-0">참여 판정</span>
            </div>
            {rows.map((care, i) => {
              const detail = details[i]
              return (
                <button
                  key={care.id}
                  type="button"
                  onClick={() => onEdit(care.id)}
                  className={
                    'flex min-h-16 w-full items-center gap-3 rounded-xl px-4 py-2 text-left transition-colors hover:bg-white ' +
                    (i > 0 ? 'border-t border-gray-200' : '')
                  }
                >
                  <span className="w-20 shrink-0 truncate text-[13.5px] font-bold text-gray-900">{care.alias}</span>
                  <span className="w-[90px] shrink-0 truncate text-[13.5px] text-gray-600">{care.groupName ?? '없음'}</span>
                  <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {care.items.length ? (
                      care.items.map((item) => (
                        <Chip key={item.id} tone="white">
                          {itemText(item)}
                        </Chip>
                      ))
                    ) : (
                      <span className="text-[13px] text-gray-400">적은 케어 없음</span>
                    )}
                  </span>
                  <span className="flex w-[120px] shrink-0 items-start">
                    <JudgementChip care={care} detail={detail?.data} loading={!!detail?.isLoading} error={!!detail?.isError} />
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <p className="pt-4 text-[13px] text-gray-500">
        개별 케어는 소속 그룹의 공통 지원 위에 더해져요. 참여 가능 목록에서 이 사람이 함께 갈 때만 따로 확인할 점을 알려 줘요.
      </p>
    </div>
  )
}

function JudgementChip({ care, detail, loading, error }: { care: CarePerson; detail?: CarePerson; loading: boolean; error: boolean }) {
  if (!care.applyToJudgement) return <Chip tone="gray">판정 미반영</Chip>
  if (loading) return <span className="text-[12.5px] text-gray-400">확인 중…</span>
  if (error || !detail?.judgementImpact) return <span className="text-[12.5px] text-gray-400">-</span>
  const n = detail.judgementImpact.affectedCount
  return n > 0 ? <Chip tone="amber">확인 필요 {n}곳</Chip> : <Chip tone="brand">영향 없음</Chip>
}

function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  ariaLabel: string
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 appearance-none rounded-xl border border-gray-200 bg-white pr-8 pl-3.5 text-[13px] font-medium text-gray-700 outline-none focus:border-brand"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <img src={chevronIcon} alt="" width={14} height={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
    </div>
  )
}
