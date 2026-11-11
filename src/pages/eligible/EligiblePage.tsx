// 03 참여 가능 프로그램 · 그룹 기준
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import { carePersonApi, programApi } from '@/api/endpoints'
import type { EligibilityResult } from '@/api/types'
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, SegmentedTabs } from '@/components/ui'
import { useSelectedGroup } from '@/lib/selectedGroup'
import { qk } from '@/lib/queryKeys'
import { cn, supportText, toYearMonth } from '@/lib/format'
import searchIcon from '@/assets/icons/eligible-search.svg'
import { Dropdown, MenuItem } from './components/Dropdown'
import { ProgramCard } from './components/ProgramCard'
import { Tag } from './components/Tag'
import { useProgramApply } from './components/useProgramApply'
import { ALL_MONTHS, monthLabel, monthOptions } from './components/programFormat'

const PAGE_SIZE = 30
type ResultTab = 'ALL' | Extract<EligibilityResult, 'ELIGIBLE' | 'CHECK'>

/** 화면 03의 필터는 주소(쿼리)에 둡니다. 상세(09)를 열어도 같은 조건이 유지됩니다. */
function useEligibleFilters() {
  const [sp, setSp] = useSearchParams()
  const careIds = useMemo(
    () => (sp.get('careIds') ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0),
    [sp],
  )
  const month = sp.get('month') ?? toYearMonth()
  const rawResult = sp.get('result')
  const result: ResultTab = rawResult === 'ELIGIBLE' || rawResult === 'CHECK' ? rawResult : 'ALL'
  const q = sp.get('q') ?? ''

  const update = (patch: Record<string, string | null>) =>
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
        return next
      },
      { replace: true },
    )

  return { sp, careIds, month, result, q, update }
}

export default function EligiblePage() {
  const { programId: openProgramId } = useParams()
  const { groups, selectedGroup, selectGroup, isLoading: groupsLoading } = useSelectedGroup()
  const { sp, careIds, month, result, q, update } = useEligibleFilters()
  const groupId = selectedGroup?.id

  // 검색어는 입력이 멈추면 주소에 반영합니다.
  const [keyword, setKeyword] = useState(q)
  useEffect(() => setKeyword(q), [q])
  useEffect(() => {
    const t = setTimeout(() => keyword !== q && update({ q: keyword.trim() || null }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword])

  // ---------- 개별 케어 ----------
  const caresQuery = useQuery({
    queryKey: qk.carePersons({ groupId }),
    queryFn: () => carePersonApi.list({ groupId }),
    enabled: !!groupId,
  })
  const cares = caresQuery.data ?? []
  const judgeable = cares.filter((c) => c.applyToJudgement)
  // careIds를 고르지 않으면 백엔드가 판정 반영이 켜진 케어를 씁니다. 화면에도 그대로 보여 줍니다.
  const selectedCares = careIds.length ? judgeable.filter((c) => careIds.includes(c.id)) : judgeable

  const toggleCare = (id: number) => {
    const current = new Set(selectedCares.map((c) => c.id))
    if (current.has(id)) current.delete(id)
    else current.add(id)
    const all = judgeable.every((c) => current.has(c.id))
    update({ careIds: current.size === 0 || all ? null : [...current].join(',') })
  }

  // ---------- 목록 ----------
  const monthParam = month === ALL_MONTHS ? undefined : month
  const base = { groupId: groupId ?? 0, careIds: careIds.length ? careIds : undefined, month: monthParam }

  const listQuery = useInfiniteQuery({
    queryKey: qk.eligible({ ...base, result, size: PAGE_SIZE }),
    queryFn: ({ pageParam }) =>
      programApi.eligible({ ...base, result: result === 'ALL' ? undefined : result, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    enabled: !!groupId,
  })

  const counts = useQueries({
    queries: (['ALL', 'ELIGIBLE', 'CHECK'] as const).map((r) => ({
      queryKey: qk.eligible({ ...base, result: r, size: 1, count: true }),
      queryFn: () => programApi.eligible({ ...base, result: r === 'ALL' ? undefined : r, page: 0, size: 1 }),
      enabled: !!groupId,
      select: (page: { totalElements: number }) => page.totalElements,
    })),
  })

  const items = useMemo(() => {
    const all = listQuery.data?.pages.flatMap((p) => p.content) ?? []
    const word = q.trim().toLowerCase()
    if (!word) return all
    return all.filter(
      (it) => it.program.title.toLowerCase().includes(word) || (it.program.hostName ?? '').toLowerCase().includes(word),
    )
  }, [listQuery.data, q])

  const { apply, modal } = useProgramApply(careIds.length ? careIds : undefined)

  const detailSearch = useMemo(() => {
    const next = new URLSearchParams(sp)
    next.delete('from')
    const s = next.toString()
    return s ? `?${s}` : ''
  }, [sp])

  if (groupsLoading) return <LoadingState />

  return (
    <div className="flex w-full flex-col">
      <PageHeader title="참여 가능 프로그램" />

      {groups.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="참여 그룹이 아직 없어요"
          description="지원 관리에서 그룹과 필요한 지원을 적으면, 그 그룹이 참여할 수 있는 프로그램을 찾아 드려요."
          action={
            <Link to="/app/support">
              <Button>그룹 만들기</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* 도구 줄 */}
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <label className="flex h-11 w-[320px] items-center gap-2 rounded-xl border border-gray-200 px-3.5 focus-within:border-brand">
              <img src={searchIcon} alt="" width={16} height={16} />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="수영, 도예, 장애인의 날 행사"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-gray-900 outline-none placeholder:text-gray-400"
                aria-label="프로그램 검색"
              />
            </label>

            <Dropdown active label={selectedGroup ? `${selectedGroup.name} · ${selectedGroup.memberCount}명` : '그룹 고르기'}>
              {(close) =>
                groups.map((g) => (
                  <MenuItem
                    key={g.id}
                    selected={g.id === groupId}
                    hint={`${g.memberCount}명`}
                    onClick={() => {
                      if (g.id !== groupId) {
                        selectGroup(g.id)
                        update({ careIds: null })
                      }
                      close()
                    }}
                  >
                    {g.name}
                  </MenuItem>
                ))
              }
            </Dropdown>

            <Dropdown
              active={selectedCares.length > 0}
              label={selectedCares.length > 0 ? `개별 케어 함께 보기 ${selectedCares.length}명` : '개별 케어 함께 보기'}
              menuClassName="w-72"
            >
              {() =>
                caresQuery.isLoading ? (
                  <p className="px-3 py-2 text-[13px] text-gray-500">불러오는 중이에요</p>
                ) : cares.length === 0 ? (
                  <div className="flex flex-col gap-2 px-3 py-2">
                    <p className="text-[13px] text-gray-500">이 그룹에 등록한 개별 케어가 없어요.</p>
                    <Link to="/app/support/care" className="text-[13px] font-medium text-brand">
                      개별 케어 등록하기
                    </Link>
                  </div>
                ) : (
                  <>
                    {cares.map((c) => {
                      const checked = selectedCares.some((s) => s.id === c.id)
                      return (
                        <label
                          key={c.id}
                          className={cn(
                            'flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-1.5',
                            c.applyToJudgement ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-brand"
                            checked={checked}
                            disabled={!c.applyToJudgement}
                            onChange={() => toggleCare(c.id)}
                          />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-[13px] font-medium text-gray-900">{c.alias}</span>
                            <span className="truncate text-xs text-gray-500">
                              {c.applyToJudgement
                                ? c.items.map((i) => i.label ?? i.content).filter(Boolean).join(', ') || '적은 케어 없음'
                                : '판정 반영이 꺼져 있어요'}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                    <p className="border-t border-gray-100 px-3 pt-2 pb-1 text-xs leading-[1.5] text-gray-400">
                      아무도 고르지 않으면 판정 반영이 켜진 케어를 모두 함께 봐요.
                    </p>
                  </>
                )
              }
            </Dropdown>

            <Dropdown label={monthLabel(month)}>
              {(close) => (
                <>
                  {monthOptions().map((o) => (
                    <MenuItem
                      key={o.value}
                      selected={o.value === month}
                      hint={o.label === '이번 달' || o.label === '다음 달' ? monthLabel(o.value, 'plain') : undefined}
                      onClick={() => {
                        update({ month: o.value === toYearMonth() ? null : o.value })
                        close()
                      }}
                    >
                      {o.label}
                    </MenuItem>
                  ))}
                  <MenuItem
                    selected={month === ALL_MONTHS}
                    onClick={() => {
                      update({ month: ALL_MONTHS })
                      close()
                    }}
                  >
                    전체 기간
                  </MenuItem>
                </>
              )}
            </Dropdown>

          </div>

          {/* 조건 줄 */}
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-medium whitespace-nowrap text-gray-500">이 조건으로 찾았어요</span>
              {selectedGroup?.supports.map((s) => (
                <Tag key={s.supportTagId} tone="gray">
                  {supportText(s)}
                </Tag>
              ))}
              {selectedGroup && selectedGroup.supports.length === 0 && <Tag tone="gray">공통 지원 없음</Tag>}
              {selectedCares.length > 0 && <Tag tone="brand">+ {selectedCares.map((c) => c.alias).join(', ')}</Tag>}
            </div>
            <span className="flex-1" />
            <SegmentedTabs<ResultTab>
              value={result}
              onChange={(v) => update({ result: v === 'ALL' ? null : v })}
              items={[
                { value: 'ALL', label: '전체', count: counts[0].data },
                { value: 'ELIGIBLE', label: '참여 가능', count: counts[1].data },
                { value: 'CHECK', label: '확인 필요', count: counts[2].data },
              ]}
            />
          </div>

          {/* 카드 */}
          {listQuery.isLoading ? (
            <LoadingState />
          ) : listQuery.isError ? (
            <ErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              className="mt-5"
              title={q ? `'${q}'에 맞는 프로그램이 없어요` : '조건에 맞는 프로그램이 없어요'}
              description={q ? '검색어를 바꾸거나 기간을 넓혀 보세요.' : '기간을 넓히거나 다른 결과 탭을 눌러 보세요.'}
              action={
                listQuery.hasNextPage ? (
                  <Button variant="outline" loading={listQuery.isFetchingNextPage} onClick={() => listQuery.fetchNextPage()}>
                    다음 목록에서 더 찾기
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-stretch gap-4 pt-5">
                {items.map((it) => (
                  <ProgramCard
                    key={it.program.programId}
                    program={it.program}
                    result={it.result}
                    counts={it}
                    selected={String(it.program.programId) === openProgramId}
                    detailTo={`/app/programs/${it.program.programId}${detailSearch}`}
                    onApply={() => apply(it.program)}
                  />
                ))}
              </div>
              {listQuery.hasNextPage && (
                <div className="flex justify-center pt-6">
                  <Button variant="outline" loading={listQuery.isFetchingNextPage} onClick={() => listQuery.fetchNextPage()}>
                    더 보기
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
      {modal}
    </div>
  )
}
