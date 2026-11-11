import { useQuery } from '@tanstack/react-query'
import { programApi } from '@/api/endpoints'
import type { District } from '@/api/types'
import { DISTRICT_LABEL } from '@/lib/labels'
import { formatNumber } from '@/lib/format'
import { qk } from '@/lib/queryKeys'
import { Dropdown, MenuItem } from './Dropdown'

export const YONGIN = '용인시'
const DISTRICTS: District[] = ['CHEOIN', 'GIHEUNG', 'SUJI']

export interface RegionValue {
  city?: string
  district?: District
}

/** 경기도 시·군 필터. 용인시는 구까지 고를 수 있습니다 (withDistricts). 숫자는 지금 볼 수 있는 프로그램 수. */
export function RegionDropdown({
  value,
  onChange,
  withDistricts = false,
}: {
  value: RegionValue
  onChange: (next: RegionValue) => void
  withDistricts?: boolean
}) {
  const citiesQuery = useQuery({ queryKey: qk.programCities, queryFn: programApi.cities, staleTime: 5 * 60_000 })
  const cities = citiesQuery.data ?? []
  const total = cities.reduce((sum, c) => sum + c.count, 0)
  const yongin = cities.find((c) => c.city === YONGIN)
  const others = cities.filter((c) => c.city !== YONGIN)

  const district = withDistricts ? value.district : undefined
  const label = district
    ? `${YONGIN} ${DISTRICT_LABEL[district]}`
    : value.city ?? '지역 전체'

  return (
    <Dropdown label={label} active={!!value.city} menuClassName="min-w-[220px]">
      {(close) => {
        const pick = (next: RegionValue) => {
          onChange(next)
          close()
        }
        return (
          <>
            <MenuItem selected={!value.city} hint={total ? formatNumber(total) : undefined} onClick={() => pick({})}>
              지역 전체
            </MenuItem>
            <MenuItem
              selected={value.city === YONGIN && !district}
              hint={yongin ? formatNumber(yongin.count) : undefined}
              onClick={() => pick({ city: YONGIN })}
            >
              {YONGIN}
            </MenuItem>
            {withDistricts &&
              DISTRICTS.map((d) => (
                <MenuItem key={d} selected={district === d} onClick={() => pick({ city: YONGIN, district: d })}>
                  <span className="pl-3 text-gray-500">└</span> {DISTRICT_LABEL[d]}
                </MenuItem>
              ))}
            {others.length > 0 && <div className="mx-2 my-1 border-t border-gray-100" role="separator" />}
            {others.map((c) => (
              <MenuItem key={c.city} selected={value.city === c.city} hint={formatNumber(c.count)} onClick={() => pick({ city: c.city })}>
                {c.city}
              </MenuItem>
            ))}
          </>
        )
      }}
    </Dropdown>
  )
}
