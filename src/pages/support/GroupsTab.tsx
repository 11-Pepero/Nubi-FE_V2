import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { groupApi } from '@/api/endpoints'
import type { Group, GroupSummary } from '@/api/types'
import { Button, Chip, EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { supportText } from '@/lib/format'
import { SUPPORT_CATEGORY_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { useSelectedGroup } from '@/lib/selectedGroup'
import { groupByCategory } from './shared'

export function GroupsTab({ onCreate, onEdit }: { onCreate: () => void; onEdit: (group: Group) => void }) {
  const groupsQuery = useQuery({ queryKey: qk.groups, queryFn: groupApi.list })
  const summaryQuery = useQuery({ queryKey: qk.groupSummary, queryFn: groupApi.summary })

  return (
    <div className="flex w-full items-start gap-6 pt-6 pb-10">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {groupsQuery.isLoading ? (
          <LoadingState />
        ) : groupsQuery.isError ? (
          <ErrorState error={groupsQuery.error} onRetry={() => groupsQuery.refetch()} />
        ) : !groupsQuery.data?.length ? (
          <EmptyState
            title="아직 공통 지원 그룹이 없어요"
            description="함께 다니는 사람들을 그룹으로 묶고, 몇 명이 어떤 지원이 필요한지 적어 주세요."
            action={<Button onClick={onCreate}>공통 지원 그룹 만들기</Button>}
          />
        ) : (
          groupsQuery.data.map((group) => <GroupCard key={group.id} group={group} onEdit={() => onEdit(group)} />)
        )}
      </div>

      <aside className="flex w-[340px] shrink-0 flex-col gap-4">
        <SummaryCard query={summaryQuery} />
        <div className="flex flex-col gap-1.5 rounded-2xl bg-brand-soft px-5 py-[18px]">
          <p className="text-[13.5px] font-bold text-brand">이름과 진단명은 적지 않아요</p>
          <p className="text-[13px] leading-[1.6] text-gray-700">
            그룹에는 몇 명이 어떤 지원이 필요한지만 남겨요. 한 사람만 따로 챙길 일은 개별 케어 명단에 별칭으로 적어요.
          </p>
        </div>
      </aside>
    </div>
  )
}

function GroupCard({ group, onEdit }: { group: Group; onEdit: () => void }) {
  const navigate = useNavigate()
  const { selectGroup } = useSelectedGroup()
  const rows = groupByCategory(group.supports)

  return (
    <section className="flex w-full flex-col gap-4 rounded-2xl bg-gray-50 px-6 pt-[22px] pb-5">
      <div className="flex w-full items-center gap-2">
        <h2 className="min-w-0 truncate text-[17px] font-bold text-gray-900">{group.name}</h2>
        <span className="inline-flex h-7 shrink-0 items-center rounded-lg bg-gray-200 px-2.5 text-[12.5px] font-medium text-gray-600">
          {group.memberCount}명 참여
        </span>
        <div className="flex-1" />
        <button type="button" onClick={onEdit} className="text-[13px] font-medium text-gray-500 hover:text-gray-900">
          수정
        </button>
      </div>

      {rows.length ? (
        <div className="flex w-full flex-col gap-2.5">
          {rows.map(({ category, items }) => (
            <div key={category} className="flex w-full items-start gap-1.5">
              <span className="w-16 shrink-0 pt-[5px] text-[12.5px] font-medium text-gray-500">
                {SUPPORT_CATEGORY_LABEL[category]}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {items.map((s) => (
                  <Chip key={s.supportTagId} tone="white">
                    {supportText(s)}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-gray-400">아직 적은 공통 지원이 없어요.</p>
      )}

      <div className="h-px w-full bg-gray-200" />

      <div className="flex w-full flex-wrap items-center gap-4 text-[13px]">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">참여 가능</span>
          <span className="font-bold text-brand">{group.eligibleCount}</span>
          <span className="ml-2 text-gray-500">확인 필요</span>
          <span className="font-bold text-amber-500">{group.checkCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">개별 케어</span>
          <span className="font-bold text-gray-900">{group.careCount}명</span>
          <Link to={`/app/support/care?groupId=${group.id}`} className="ml-2 font-medium text-brand hover:underline">
            명단 보기
          </Link>
        </div>
        <div className="flex-1" />
        <Button
          variant="soft"
          size="sm"
          onClick={() => {
            selectGroup(group.id)
            navigate('/app/eligible')
          }}
        >
          이 그룹으로 프로그램 찾기
        </Button>
      </div>
    </section>
  )
}

function SummaryCard({ query }: { query: UseQueryResult<GroupSummary> }) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-2xl bg-gray-50 px-6 py-[22px]">
      <p className="text-[15px] font-bold text-gray-900">기관 전체</p>
      {query.isLoading ? (
        <LoadingState className="py-6" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-6" />
      ) : query.data ? (
        <>
          <div className="flex items-baseline gap-1">
            <span className="text-[34px] font-bold text-gray-900">{query.data.memberCount}</span>
            <span className="text-[14px] font-medium text-gray-500">명이 함께 다녀요</span>
          </div>
          {query.data.supports.length ? (
            query.data.supports.map((s) => {
              const ratio = query.data!.memberCount ? Math.min(1, s.count / query.data!.memberCount) : 0
              return (
                <div key={s.supportTagId} className="flex w-full flex-col gap-1.5">
                  <div className="flex w-full items-start text-[13px]">
                    <span className="min-w-0 flex-1 text-gray-600">{s.label}</span>
                    <span className="shrink-0 font-medium text-gray-900">{s.count}명</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-[3px] bg-gray-200">
                    <div className="h-full rounded-[3px] bg-brand" style={{ width: `${ratio * 100}%` }} />
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-[13px] text-gray-400">그룹에 지원 항목을 적으면 여기에 모여요.</p>
          )}
        </>
      ) : null}
    </div>
  )
}
