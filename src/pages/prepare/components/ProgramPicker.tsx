import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { programApi } from '@/api/endpoints'
import type { EligibilityResult, ProgramSummary } from '@/api/types'
import { Button, EmptyState, ErrorState, Input, LoadingState, PageHeader, SegmentedTabs } from '@/components/ui'
import { applyMethodLabel, ELIGIBILITY_RESULT_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { cn, dDay, formatDateTime } from '@/lib/format'
import { useSelectedGroup } from '@/lib/selectedGroup'

type Mode = 'eligible' | 'search'

const RESULT_TONE: Record<EligibilityResult, string> = {
  ELIGIBLE: 'bg-brand-soft text-brand',
  CHECK: 'bg-amber-50 text-amber-500',
  NOT: 'bg-red-50 text-red-500',
}

/** programId 없이 들어왔을 때: 신청을 준비할 프로그램 고르기. */
export function ProgramPicker({ onPick }: { onPick: (programId: number) => void }) {
  const { selectedGroup } = useSelectedGroup()
  const [mode, setMode] = useState<Mode>(selectedGroup ? 'eligible' : 'search')
  const [keyword, setKeyword] = useState('')
  const [submitted, setSubmitted] = useState('')

  const eligibleParams = { groupId: selectedGroup?.id ?? 0, size: 50 }
  const eligible = useQuery({
    queryKey: qk.eligible(eligibleParams),
    queryFn: () => programApi.eligible(eligibleParams),
    enabled: mode === 'eligible' && !!selectedGroup,
  })
  const searchParams = { keyword: submitted || undefined, size: 50 }
  const search = useQuery({
    queryKey: qk.programs(searchParams),
    queryFn: () => programApi.search(searchParams),
    enabled: mode === 'search',
  })

  const active = mode === 'eligible' ? eligible : search
  const rows: { program: ProgramSummary; result?: EligibilityResult }[] =
    mode === 'eligible'
      ? (eligible.data?.content ?? []).map((e) => ({ program: e.program, result: e.result }))
      : (search.data?.content ?? []).map((program) => ({ program }))
  const openRows = rows.filter((r) => r.program.status === 'OPEN')

  return (
    <div className="flex w-full flex-col">
      <PageHeader title="프로그램 신청 준비" />
      <p className="-mt-2 pb-5 text-[13px] text-gray-500">
        신청할 프로그램을 고르면 접수처와 신청서, 문의 문자를 정리해 드려요.
      </p>

      <div className="flex w-full items-center gap-3 pb-4">
        <SegmentedTabs<Mode>
          value={mode}
          onChange={setMode}
          items={[
            { value: 'eligible', label: selectedGroup ? `${selectedGroup.name} 참여 가능` : '참여 가능' },
            { value: 'search', label: '전체에서 찾기' },
          ]}
        />
        {mode === 'search' && (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setSubmitted(keyword.trim())
            }}
          >
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="프로그램 이름으로 찾기" className="h-9 text-[13.5px]" />
            <Button type="submit" variant="dark">
              찾기
            </Button>
          </form>
        )}
      </div>

      {mode === 'eligible' && !selectedGroup ? (
        <EmptyState title="참여 그룹이 없어요" description="지원 관리에서 그룹을 먼저 만들거나, 전체에서 찾아 주세요." />
      ) : active.isLoading ? (
        <LoadingState />
      ) : active.error ? (
        <ErrorState error={active.error} onRetry={active.refetch} />
      ) : openRows.length === 0 ? (
        <EmptyState title="지금 신청할 수 있는 프로그램이 없어요" description="다른 조건으로 찾아보세요." />
      ) : (
        <div className="flex w-full flex-col gap-2">
          {openRows.map(({ program, result }) => {
            const deadline = dDay(program.deadlineAt)
            return (
              <div key={program.programId} className="flex min-h-[72px] items-center gap-4 rounded-[14px] bg-gray-50 py-3 pr-4 pl-5">
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-[14.5px] font-bold text-gray-900">{program.title}</p>
                    {deadline && deadline !== '마감' && <span className="shrink-0 text-[12.5px] font-bold text-brand">마감 {deadline}</span>}
                  </div>
                  <p className="truncate text-[12.5px] text-gray-500">
                    {[program.hostName, program.venue?.name, formatDateTime(program.startAt)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {result && (
                  <span className={cn('flex h-[26px] shrink-0 items-center rounded-[7px] px-2 text-xs font-medium', RESULT_TONE[result])}>
                    {ELIGIBILITY_RESULT_LABEL[result]}
                  </span>
                )}
                <span
                  className={cn(
                    'flex h-[26px] shrink-0 items-center rounded-[7px] px-2 text-xs font-medium',
                    program.applyMethod === 'DIRECT' ? 'bg-brand-soft text-brand' : 'bg-white text-gray-700',
                  )}
                >
                  {program.applyMethod === 'DIRECT' ? '바로 신청' : applyMethodLabel(program.applyMethod)}
                </span>
                <Button variant="outline" className="h-[34px] rounded-[17px]" onClick={() => onPick(program.programId)}>
                  준비하기
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
