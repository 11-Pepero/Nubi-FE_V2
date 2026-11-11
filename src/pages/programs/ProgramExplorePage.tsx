// 04 프로그램 탐색
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { programApi } from '@/api/endpoints'
import type { ApplyMethod, District, EligibilityResult, ProgramCategory, ProgramSearchParams } from '@/api/types'
import { EmptyState, ErrorState, LoadingState, PageHeader, LoadMore } from '@/components/ui'
import { APPLY_METHOD_LABEL, DISTRICT_LABEL } from '@/lib/labels'
import { useSelectedGroup } from '@/lib/selectedGroup'
import { qk } from '@/lib/queryKeys'
import { cn, formatNumber, toYearMonth } from '@/lib/format'
import searchIcon from '@/assets/icons/eligible-search.svg'
import gridIcon from '@/assets/icons/programs-grid.svg'
import listIcon from '@/assets/icons/programs-list.svg'
import { Dropdown, MenuItem } from '@/pages/eligible/components/Dropdown'
import { ProgramCard } from '@/pages/eligible/components/ProgramCard'
import { useProgramApply } from '@/pages/eligible/components/useProgramApply'
import { ALL_MONTHS, monthLabel, monthOptions } from '@/pages/eligible/components/programFormat'
import { ProgramRow } from './components/ProgramRow'

const PAGE_SIZE = 20

/** 탐색 화면 분야 이름 (디자인 문구) */
const CATEGORY_TABS: { value: ProgramCategory; label: string }[] = [
  { value: 'CULTURE', label: '문화와 예술' },
  { value: 'SPORTS', label: '체육' },
  { value: 'EDUCATION', label: '평생교육' },
  { value: 'HEALTH', label: '보건' },
  { value: 'BENEFIT', label: '할인과 혜택' },
]
const DISTRICTS: District[] = ['CHEOIN', 'GIHEUNG', 'SUJI']
const APPLY_METHODS: ApplyMethod[] = ['DIRECT', 'ONLINE', 'PHONE', 'PAPER']

function useExploreFilters() {
  const [sp, setSp] = useSearchParams()
  const pick = <T extends string>(key: string, allowed: readonly T[]) => {
    const v = sp.get(key) as T | null
    return v && allowed.includes(v) ? v : undefined
  }
  const filters = {
    q: sp.get('q') ?? '',
    category: pick('category', CATEGORY_TABS.map((c) => c.value)),
    district: pick('district', DISTRICTS),
    month: sp.get('month') ?? toYearMonth(),
    applyMethod: pick('method', APPLY_METHODS),
    accessibleOnly: sp.get('accessible') === '1',
    view: sp.get('view') === 'grid' ? ('grid' as const) : ('list' as const),
  }
  const update = (patch: Record<string, string | null>) =>
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
        return next
      },
      { replace: true },
    )
  return { sp, filters, update }
}

export default function ProgramExplorePage() {
  const { programId: openProgramId } = useParams()
  const { sp, filters, update } = useExploreFilters()
  const { selectedGroup } = useSelectedGroup()
  const { apply, modal } = useProgramApply()

  const [keyword, setKeyword] = useState(filters.q)
  useEffect(() => setKeyword(filters.q), [filters.q])
  useEffect(() => {
    const t = setTimeout(() => keyword !== filters.q && update({ q: keyword.trim() || null }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword])

  const monthParam = filters.month === ALL_MONTHS ? undefined : filters.month
  const params: ProgramSearchParams = {
    keyword: filters.q || undefined,
    category: filters.category,
    district: filters.district,
    month: monthParam,
    applyMethod: filters.applyMethod,
    accessibleOnly: filters.accessibleOnly || undefined,
  }

  const listQuery = useInfiniteQuery({
    queryKey: qk.programs({ ...params, size: PAGE_SIZE }),
    queryFn: ({ pageParam }) => programApi.search({ ...params, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })

  // 고른 그룹 기준 판정을 함께 보여 줍니다 (공개 중인 프로그램만 판정됩니다).
  const eligibleQuery = useQuery({
    queryKey: qk.eligible({ groupId: selectedGroup?.id, month: monthParam, page: 0, size: 100 }),
    queryFn: () => programApi.eligible({ groupId: selectedGroup!.id, month: monthParam, page: 0, size: 100 }),
    enabled: !!selectedGroup,
  })
  const resultMap = useMemo(() => {
    const map = new Map<number, EligibilityResult>()
    eligibleQuery.data?.content.forEach((it) => map.set(it.program.programId, it.result))
    return map
  }, [eligibleQuery.data])

  const programs = listQuery.data?.pages.flatMap((p) => p.content) ?? []
  const total = listQuery.data?.pages[0]?.totalElements

  const detailTo = (id: number) => {
    const next = new URLSearchParams(sp)
    next.set('from', 'explore')
    return `/app/programs/${id}?${next.toString()}`
  }

  return (
    <div className="flex w-full flex-col">
      <PageHeader title="프로그램 탐색" />

      {/* 검색과 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-11 w-[340px] items-center gap-2 rounded-xl border border-gray-200 px-3.5 focus-within:border-brand">
          <img src={searchIcon} alt="" width={16} height={16} />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="프로그램, 기관, 장소로 찾기"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-gray-900 outline-none placeholder:text-gray-400"
            aria-label="프로그램 검색"
          />
        </label>

        <Dropdown label={CATEGORY_TABS.find((c) => c.value === filters.category)?.label ?? '분야 전체'}>
          {(close) => (
            <>
              <MenuItem selected={!filters.category} onClick={() => (update({ category: null }), close())}>
                분야 전체
              </MenuItem>
              {CATEGORY_TABS.map((c) => (
                <MenuItem key={c.value} selected={filters.category === c.value} onClick={() => (update({ category: c.value }), close())}>
                  {c.label}
                </MenuItem>
              ))}
            </>
          )}
        </Dropdown>

        <Dropdown label={filters.district ? DISTRICT_LABEL[filters.district] : '구 전체'} active={!!filters.district}>
          {(close) => (
            <>
              <MenuItem selected={!filters.district} onClick={() => (update({ district: null }), close())}>
                구 전체
              </MenuItem>
              {DISTRICTS.map((d) => (
                <MenuItem key={d} selected={filters.district === d} onClick={() => (update({ district: d }), close())}>
                  {DISTRICT_LABEL[d]}
                </MenuItem>
              ))}
            </>
          )}
        </Dropdown>

        <Dropdown label={monthLabel(filters.month, 'plain')}>
          {(close) => (
            <>
              {monthOptions().map((o) => (
                <MenuItem
                  key={o.value}
                  selected={filters.month === o.value}
                  onClick={() => (update({ month: o.value === toYearMonth() ? null : o.value }), close())}
                >
                  {monthLabel(o.value, 'plain')}
                </MenuItem>
              ))}
              <MenuItem selected={filters.month === ALL_MONTHS} onClick={() => (update({ month: ALL_MONTHS }), close())}>
                전체 기간
              </MenuItem>
            </>
          )}
        </Dropdown>

        <Dropdown label={filters.applyMethod ? APPLY_METHOD_LABEL[filters.applyMethod] : '신청 방법 전체'}>
          {(close) => (
            <>
              <MenuItem selected={!filters.applyMethod} onClick={() => (update({ method: null }), close())}>
                신청 방법 전체
              </MenuItem>
              {APPLY_METHODS.map((m) => (
                <MenuItem key={m} selected={filters.applyMethod === m} onClick={() => (update({ method: m }), close())}>
                  {APPLY_METHOD_LABEL[m]}
                </MenuItem>
              ))}
            </>
          )}
        </Dropdown>
      </div>

      {/* 분야 알약 */}
      <div className="flex flex-wrap gap-1.5 pt-3.5">
        {[{ value: undefined, label: '전체' }, ...CATEGORY_TABS].map((c) => {
          const active = filters.category === c.value
          return (
            <button
              key={c.label}
              type="button"
              aria-pressed={active}
              onClick={() => update({ category: c.value ?? null })}
              className={cn(
                'h-9 rounded-[18px] px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                active ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* 개수 · 접근성 · 보기 방식 */}
      <div className="flex items-center gap-3 pt-[18px] pb-2.5">
        <p className="text-[13.5px] font-medium text-gray-700">{total != null ? `${formatNumber(total)}개의 프로그램` : ' '}</p>
        <span className="flex-1" />
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-600">
          <input
            type="checkbox"
            className="size-4 accent-brand"
            checked={filters.accessibleOnly}
            onChange={(e) => update({ accessible: e.target.checked ? '1' : null })}
          />
          접근성 정보 있는 것만
        </label>
        <div role="tablist" aria-label="보기 방식" className="flex gap-0.5 rounded-[10px] bg-gray-100 p-[3px]">
          {(
            [
              ['grid', gridIcon, '카드로 보기'],
              ['list', listIcon, '목록으로 보기'],
            ] as const
          ).map(([v, icon, label]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={filters.view === v}
              aria-label={label}
              onClick={() => update({ view: v === 'list' ? null : v })}
              className={cn('flex h-7 w-[30px] items-center justify-center rounded-lg', filters.view === v && 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]')}
            >
              <img src={icon} alt="" width={15} height={15} />
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} />
      ) : programs.length === 0 ? (
        <EmptyState title="조건에 맞는 프로그램이 없어요" description="검색어를 바꾸거나 기간·지역을 넓혀 보세요." />
      ) : (
        <>
          {filters.view === 'list' ? (
            <div className="flex flex-col gap-2">
              {programs.map((p) => (
                <ProgramRow
                  key={p.programId}
                  program={p}
                  result={resultMap.get(p.programId) ?? null}
                  detailTo={detailTo(p.programId)}
                  onApply={() => apply(p)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-4">
              {programs.map((p) => (
                <ProgramCard
                  key={p.programId}
                  program={p}
                  result={resultMap.get(p.programId) ?? null}
                  selected={String(p.programId) === openProgramId}
                  detailTo={detailTo(p.programId)}
                  onApply={() => apply(p)}
                />
              ))}
            </div>
          )}
          <LoadMore query={listQuery} className="pt-6" />
        </>
      )}
      {modal}
    </div>
  )
}
