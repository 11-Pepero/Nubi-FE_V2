import type { District } from '@/api/types'

/**
 * 용인시 3개 구를 단순화한 윤곽 (경도, 위도).
 * 실제 행정 경계가 아니라 지도 표시용 근사 도형이며, 시설·프로그램 좌표와 같은 선형 변환을 씁니다.
 */
export const BOUNDS = { minLon: 127.03, maxLon: 127.43, minLat: 37.09, maxLat: 37.37 }

/** viewBox 크기. 위도 1도와 경도 1도의 실제 거리 비(cos 37.2°)를 반영한 비율입니다. */
export const VIEW_W = 1000
export const VIEW_H = 880

export function project(lon: number, lat: number): [number, number] {
  const x = ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * VIEW_W
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * VIEW_H
  return [x, y]
}

export function inBounds(lon: number, lat: number) {
  return lon >= BOUNDS.minLon - 0.02 && lon <= BOUNDS.maxLon + 0.02 && lat >= BOUNDS.minLat - 0.02 && lat <= BOUNDS.maxLat + 0.02
}

type LonLat = [number, number]

const SUJI: LonLat[] = [
  [127.04, 37.36], [127.07, 37.368], [127.095, 37.367], [127.12, 37.345], [127.13, 37.32],
  [127.1, 37.3], [127.06, 37.295], [127.035, 37.31], [127.03, 37.335],
]

const GIHEUNG: LonLat[] = [
  [127.035, 37.31], [127.06, 37.295], [127.1, 37.3], [127.13, 37.32], [127.15, 37.3],
  [127.17, 37.27], [127.16, 37.23], [127.13, 37.21], [127.09, 37.212], [127.06, 37.24], [127.045, 37.27],
]

const CHEOIN: LonLat[] = [
  [127.12, 37.345], [127.16, 37.368], [127.22, 37.36], [127.28, 37.352], [127.33, 37.322],
  [127.38, 37.3], [127.42, 37.262], [127.428, 37.2], [127.4, 37.14], [127.35, 37.1],
  [127.29, 37.092], [127.23, 37.11], [127.18, 37.14], [127.14, 37.17], [127.13, 37.21],
  [127.16, 37.23], [127.17, 37.27], [127.15, 37.3], [127.13, 37.32],
]

function toPath(points: LonLat[]) {
  return (
    points
      .map(([lon, lat], i) => {
        const [x, y] = project(lon, lat)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ') + ' Z'
  )
}

export interface DistrictShape {
  district: District
  name: string
  path: string
  /** 이름표 위치 (viewBox 좌표) */
  label: [number, number]
}

export const DISTRICT_SHAPES: DistrictShape[] = [
  { district: 'SUJI', name: '수지구', path: toPath(SUJI), label: project(127.075, 37.338) },
  { district: 'GIHEUNG', name: '기흥구', path: toPath(GIHEUNG), label: project(127.1, 37.262) },
  { district: 'CHEOIN', name: '처인구', path: toPath(CHEOIN), label: project(127.29, 37.225) },
]
