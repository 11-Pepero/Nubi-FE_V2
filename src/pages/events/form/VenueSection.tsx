import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { venueApi } from '@/api/endpoints'
import type { Facility, Venue } from '@/api/types'
import { Spinner } from '@/components/ui'
import { DISTRICT_LABEL, FACILITY_TYPE_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { FormField, SectionCard, inputClass } from './fields'
import iconSparkle from '@/assets/icons/events-sparkle.svg'
import iconCheck from '@/assets/icons/events-check.svg'

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** 장소 검색해서 고르기 + 고른 장소의 편의시설 미리 보기. */
export function VenueSection({ venue, onChange }: { venue: Venue | null; onChange: (venue: Venue | null) => void }) {
  const [keyword, setKeyword] = useState(venue?.name ?? '')
  const [open, setOpen] = useState(false)
  const debounced = useDebounced(keyword.trim(), 250)


  const search = useQuery({
    queryKey: qk.venues(debounced),
    queryFn: () => venueApi.search({ keyword: debounced || undefined, size: 8 }),
    enabled: open,
  })

  const facilities = useQuery({
    queryKey: qk.venueFacilities(venue?.venueId ?? 0),
    queryFn: () => venueApi.facilities(venue!.venueId),
    enabled: !!venue,
  })

  return (
    <SectionCard title="장소와 편의시설">
      <FormField label="장소">
        <div className="relative w-full">
          <input
            className={inputClass}
            value={keyword}
            placeholder="장소 이름이나 주소로 찾아요"
            onChange={(e) => {
              setKeyword(e.target.value)
              setOpen(true)
              if (venue) onChange(null)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && (
            <div className="absolute inset-x-0 top-12 z-20 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              {search.isPending ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : search.isError ? (
                <p className="px-4 py-3 text-[13px] text-red-500">장소를 불러오지 못했어요.</p>
              ) : search.data.content.length === 0 ? (
                <p className="px-4 py-3 text-[13px] text-gray-500">찾는 장소가 없어요.</p>
              ) : (
                search.data.content.map((v) => (
                  <button
                    key={v.venueId}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(v)
                      setKeyword(v.name)
                      setOpen(false)
                    }}
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left hover:bg-gray-50"
                  >
                    <span className="text-[13.5px] font-medium text-gray-900">{v.name}</span>
                    <span className="text-xs text-gray-500">
                      {[v.district ? DISTRICT_LABEL[v.district] : null, v.address].filter(Boolean).join(' · ') || '주소 정보 없음'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </FormField>

      {venue && (
        <div className="flex w-full flex-col gap-2.5 rounded-xl bg-white px-4 py-3.5">
          {facilities.isPending ? (
            <div className="flex items-center gap-2 text-[13px] text-gray-500">
              <Spinner /> 편의시설을 찾고 있어요
            </div>
          ) : facilities.isError ? (
            <p className="text-[13px] text-red-500">편의시설 정보를 불러오지 못했어요.</p>
          ) : (
            <FacilityList facilities={facilities.data.facilities} />
          )}
        </div>
      )}
    </SectionCard>
  )
}

function FacilityList({ facilities }: { facilities: Facility[] }) {
  if (facilities.length === 0) {
    return <p className="text-[13px] text-gray-500">이 장소는 아직 편의시설 정보가 없어요.</p>
  }
  const fromPublic = facilities.some((f) => f.sources.some((s) => s.source === 'PUBLIC_DATA'))
  const unknown = facilities.filter((f) => f.status === 'UNKNOWN').map((f) => FACILITY_TYPE_LABEL[f.facilityType])

  return (
    <>
      <div className="flex w-full items-center gap-1.5">
        <img src={iconSparkle} alt="" width={15} height={15} />
        <p className="text-[13px] font-medium text-brand">
          {fromPublic ? '장애인편의시설 공공데이터에서 찾았어요' : '이 장소의 편의시설 정보예요'}
        </p>
      </div>
      <div className="flex w-full flex-wrap gap-1.5">
        {facilities.map((f) =>
          f.status === 'YES' ? (
            <span
              key={f.facilityType}
              className="flex h-[30px] items-center gap-1 rounded-lg bg-brand-soft px-2.5 text-[12.5px] font-medium text-brand"
            >
              <img src={iconCheck} alt="" width={13} height={13} />
              {FACILITY_TYPE_LABEL[f.facilityType]}
            </span>
          ) : (
            <span
              key={f.facilityType}
              className="flex h-[30px] items-center rounded-lg bg-gray-100 px-2.5 text-[12.5px] font-medium text-gray-500"
              title={f.status === 'NO' ? '없음' : '확인 안 됨'}
            >
              {FACILITY_TYPE_LABEL[f.facilityType]}
              {f.status === 'NO' ? ' 없음' : ''}
            </span>
          ),
        )}
      </div>
      {unknown.length > 0 && (
        <p className="w-full text-[12.5px] text-gray-500">{unknown.join(', ')}은(는) 데이터에 없어서 비워 뒀어요.</p>
      )}
    </>
  )
}
