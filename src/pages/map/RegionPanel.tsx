import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { regionApi } from '@/api/endpoints'
import type { District, DistrictStat } from '@/api/types'
import { errorMessage } from '@/api/client'
import { Spinner } from '@/components/ui'
import { DISTRICT_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { cn, formatNumber } from '@/lib/format'
import closeIcon from '@/assets/icons/support-close.svg'
import { monthNumber } from './month'

const VISIBLE_EMDS = 4

/** 세 구를 비교해 이 구의 사정을 한 문장으로 요약합니다. */
function insight(stat: DistrictStat, all: DistrictStat[]): string {
  const ppf = stat.programsPerFacility
  if (stat.facilityCount === 0 || ppf == null) {
    return stat.programCount > 0 ? `복지시설 자료는 없고, 이번 달 프로그램은 ${stat.programCount}개예요.` : '이 구는 복지시설 자료가 아직 없어요.'
  }
  const rated = all.filter((d) => d.programsPerFacility != null)
  const minPpf = Math.min(...rated.map((d) => d.programsPerFacility as number))
  const maxPpf = Math.max(...rated.map((d) => d.programsPerFacility as number))
  const maxFacilities = Math.max(...all.map((d) => d.facilityCount))
  const perFacility = `시설 한 곳당 ${ppf.toFixed(1)}개예요.`

  if (rated.length > 1 && ppf === minPpf && stat.facilityCount === maxFacilities) {
    return `시설은 가장 많은데 갈 수 있는 프로그램은 가장 적어요. ${perFacility}`
  }
  if (rated.length > 1 && ppf === minPpf) return `세 구 가운데 시설 대비 프로그램이 가장 적어요. ${perFacility}`
  if (rated.length > 1 && ppf === maxPpf) return `세 구 가운데 시설 대비 프로그램이 가장 많아요. ${perFacility}`
  return perFacility
}

export function RegionPanel({
  district,
  month,
  stats,
  onClose,
  className,
}: {
  district: District
  month: string
  stats: DistrictStat[]
  onClose: () => void
  className?: string
}) {
  const [showAll, setShowAll] = useState(false)
  const detail = useQuery({
    queryKey: qk.district(district, month),
    queryFn: () => regionApi.district(district, month),
  })

  const summary = detail.data?.summary ?? stats.find((s) => s.district === district)
  const emds = detail.data?.emds ?? []
  const visibleEmds = showAll ? emds : emds.slice(0, VISIBLE_EMDS)

  return (
    <aside
      className={cn(
        'flex w-[340px] flex-col gap-4 overflow-y-auto rounded-2xl border border-gray-200 bg-white px-[23px] py-[21px] shadow-[0_8px_24px_rgba(17,24,39,0.08)]',
        className,
      )}
    >
      <div className="flex items-center">
        <h2 className="min-w-0 flex-1 text-[18px] font-bold text-gray-900">{summary?.name ?? DISTRICT_LABEL[district]}</h2>
        <button type="button" onClick={onClose} aria-label="닫기" className="flex size-[18px] items-center justify-center">
          <img src={closeIcon} alt="" className="size-[18px]" />
        </button>
      </div>

      {summary && (
        <>
          <dl className="grid grid-cols-3 gap-2">
            <Stat label="복지시설" value={`${formatNumber(summary.facilityCount)}곳`} />
            <Stat label="1천명당 시설" value={summary.facilitiesPerThousand.toFixed(1)} />
            <Stat label={`${monthNumber(month)}월 프로그램`} value={`${formatNumber(summary.programCount)}개`} />
          </dl>
          <p className="rounded-xl bg-brand-soft px-3.5 py-3 text-[13.5px] leading-[1.55] text-gray-700">
            {insight(summary, stats)}
            {summary.programCount > 0 && ` 이 중 접근성 정보가 있는 프로그램은 ${summary.accessibleProgramCount}개예요.`}
          </p>
        </>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-[13.5px] font-bold text-gray-900">참여 기회가 적은 동네</h3>
        {detail.isPending ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : detail.isError ? (
          <div className="flex flex-col items-start gap-1.5 py-3">
            <p className="text-[13px] text-red-500">{errorMessage(detail.error)}</p>
            <button type="button" onClick={() => detail.refetch()} className="text-[12.5px] font-medium text-gray-500 hover:text-gray-900">
              다시 시도
            </button>
          </div>
        ) : emds.length === 0 ? (
          <p className="py-4 text-[13px] text-gray-500">읍면동 자료가 아직 없어요.</p>
        ) : (
          <>
            <ul className="flex flex-col">
              {visibleEmds.map((e, i) => (
                <li key={e.emdCode} className={cn('flex h-9 items-center gap-2', i > 0 && 'border-t border-gray-100')}>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-gray-900">{e.emdName}</span>
                  <span className="shrink-0 text-[12.5px] text-gray-500">시설 {e.facilityCount}</span>
                  <span className={cn('w-[60px] shrink-0 text-right text-[12.5px]', e.programCount === 0 ? 'font-bold text-red-500' : 'text-gray-500')}>
                    프로그램 {e.programCount}
                  </span>
                </li>
              ))}
            </ul>
            {emds.length > VISIBLE_EMDS && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="self-start text-[12.5px] font-medium text-gray-500 hover:text-gray-900">
                {showAll ? '접기' : `${emds.length - VISIBLE_EMDS}곳 더 보기`}
              </button>
            )}
          </>
        )}
      </div>

      <Link
        to="/app/events/new"
        className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-[13.5px] font-bold text-gray-700 hover:bg-gray-50"
      >
        이 지역에 행사 올리기
      </Link>
    </aside>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-gray-50 px-3 py-2.5">
      <dt className="text-[11.5px] text-gray-500">{label}</dt>
      <dd className="text-[16px] font-bold text-gray-900">{value}</dd>
    </div>
  )
}
