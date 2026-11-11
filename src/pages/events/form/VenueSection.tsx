import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { venueApi } from '@/api/endpoints'
import type { Facility, PlaceCandidate, Venue, VenueFacilities } from '@/api/types'
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

/** 장소 검색해서 고르기 + 고른 장소의 편의시설 미리 보기.
 *  우리 장소 목록에 없으면 카카오 장소 검색 결과에서 골라 바로 등록해요. */
export function VenueSection({ venue, onChange }: { venue: Venue | null; onChange: (venue: Venue | null) => void }) {
  const [keyword, setKeyword] = useState(venue?.name ?? '')
  const [open, setOpen] = useState(false)
  // 방금 카카오에서 골라 등록한 장소. 편의시설은 등록 뒤 서버가 따로 채우므로 잠시 다시 불러와요.
  const [registeredId, setRegisteredId] = useState<number | null>(null)
  const debounced = useDebounced(keyword.trim(), 250)

  const search = useQuery({
    queryKey: qk.venues(debounced),
    queryFn: () => venueApi.search({ keyword: debounced || undefined, size: 8 }),
    enabled: open,
  })

  const places = useQuery({
    queryKey: qk.venuePlaces(debounced),
    queryFn: () => venueApi.places(debounced),
    enabled: open && debounced.length > 0,
    staleTime: 5 * 60_000,
  })

  const register = useMutation({
    mutationFn: (place: PlaceCandidate) =>
      venueApi.register({
        name: place.name,
        address: place.roadAddress || place.address || place.name,
        latitude: place.latitude,
        longitude: place.longitude,
      }),
    onSuccess: (registered, place) => {
      if (place.venueId == null) setRegisteredId(registered.venueId)
      onChange(registered)
      setKeyword(registered.name)
    },
  })

  // 12초 동안만 기다려요. 그 뒤에도 비어 있으면 데이터에 없는 장소예요.
  useEffect(() => {
    if (registeredId == null) return
    const t = setTimeout(() => setRegisteredId(null), 12_000)
    return () => clearTimeout(t)
  }, [registeredId])

  const polling = !!venue && registeredId === venue.venueId
  const facilities = useQuery({
    queryKey: qk.venueFacilities(venue?.venueId ?? 0),
    queryFn: () => venueApi.facilities(venue!.venueId),
    enabled: !!venue,
    // 새로 등록한 장소는 편의시설이 아직 하나도 확인되지 않은 동안 2초마다 다시 불러와요.
    refetchInterval: (q) => (polling && !hasKnownFacility(q.state.data) ? 2000 : false),
  })
  const waitingFacilities = polling && !!facilities.data && !hasKnownFacility(facilities.data)

  const ours = search.data?.content ?? []
  const ourIds = new Set(ours.map((v) => v.venueId))
  // 우리 목록에 이미 보이는 장소는 카카오 결과에서 빼요.
  const kakao = (places.data ?? []).filter((p) => p.venueId == null || !ourIds.has(p.venueId))

  const pick = (v: Venue) => {
    onChange(v)
    setKeyword(v.name)
    setOpen(false)
  }

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
              register.reset()
              if (venue) onChange(null)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && (
            <div className="absolute inset-x-0 top-12 z-20 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              {search.isPending ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : search.isError ? (
                <p className="px-4 py-3 text-[13px] text-red-500">장소를 불러오지 못했어요.</p>
              ) : (
                <>
                  {ours.length > 0 && debounced && <GroupLabel>등록된 장소</GroupLabel>}
                  {ours.map((v) => (
                    <OptionButton
                      key={`v-${v.venueId}`}
                      title={v.name}
                      sub={[v.district ? DISTRICT_LABEL[v.district] : null, v.address].filter(Boolean).join(' · ') || '주소 정보 없음'}
                      onPick={() => pick(v)}
                    />
                  ))}

                  {debounced && (
                    <>
                      <GroupLabel>카카오 지도에서 찾은 장소</GroupLabel>
                      {places.isPending ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-gray-500">
                          <Spinner /> 카카오에서 찾고 있어요
                        </div>
                      ) : places.isError ? (
                        <p className="px-4 py-2.5 text-[13px] text-red-500">카카오 장소를 불러오지 못했어요.</p>
                      ) : kakao.length === 0 ? (
                        <p className="px-4 py-2.5 text-[13px] text-gray-500">
                          {ours.length > 0 ? '더 찾은 장소가 없어요.' : '용인시에서 찾는 장소가 없어요.'}
                        </p>
                      ) : (
                        kakao.map((p) => (
                          <OptionButton
                            key={`k-${p.kakaoPlaceId}`}
                            title={p.name}
                            badge={p.category}
                            sub={p.roadAddress || p.address || '주소 정보 없음'}
                            disabled={register.isPending}
                            onPick={() => {
                              setOpen(false)
                              setKeyword(p.name)
                              register.mutate(p)
                            }}
                          />
                        ))
                      )}
                    </>
                  )}

                  {!debounced && ours.length === 0 && (
                    <p className="px-4 py-3 text-[13px] text-gray-500">장소 이름을 입력하면 카카오 지도에서도 찾아요.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </FormField>

      {register.isPending && (
        <div className="flex w-full items-center gap-2 rounded-xl bg-white px-4 py-3.5 text-[13px] text-gray-500">
          <Spinner /> 고른 장소를 등록하고 있어요
        </div>
      )}
      {register.isError && (
        <p className="w-full rounded-xl bg-white px-4 py-3.5 text-[13px] text-red-500">
          장소를 등록하지 못했어요. 다시 골라 주세요.
        </p>
      )}

      {venue && (
        <div className="flex w-full flex-col gap-2.5 rounded-xl bg-white px-4 py-3.5">
          {facilities.isPending || waitingFacilities ? (
            <div className="flex items-center gap-2 text-[13px] text-gray-500">
              <Spinner /> {waitingFacilities ? '공공데이터에서 편의시설을 찾고 있어요' : '편의시설을 찾고 있어요'}
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

function hasKnownFacility(data?: VenueFacilities) {
  return !!data?.facilities.some((f) => f.status !== 'UNKNOWN')
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-4 pb-1 pt-2.5 text-[11.5px] font-semibold text-gray-400">{children}</p>
}

function OptionButton({
  title,
  sub,
  badge,
  disabled,
  onPick,
}: {
  title: string
  sub: string
  badge?: string | null
  disabled?: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
    >
      <span className="flex w-full items-center gap-1.5">
        <span className="truncate text-[13.5px] font-medium text-gray-900">{title}</span>
        {badge && (
          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-px text-[11px] text-gray-500">{badge}</span>
        )}
      </span>
      <span className="w-full truncate text-xs text-gray-500">{sub}</span>
    </button>
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
