// 07 사각지대 지도
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { regionApi } from '@/api/endpoints'
import type { District, DistrictStat, Markers } from '@/api/types'
import { ErrorState, LoadingState, PageHeader, SegmentedTabs, Spinner } from '@/components/ui'
import { qk } from '@/lib/queryKeys'
import { cn, toYearMonth } from '@/lib/format'
import plusIcon from '@/assets/icons/plus.svg'
import minusIcon from '@/assets/icons/map-minus.svg'
import { DISTRICT_SHAPES, VIEW_H, VIEW_W, inBounds, project } from './yonginGeo'
import { MonthPicker } from './MonthPicker'
import { RegionPanel } from './RegionPanel'

type Layer = 'opportunity' | 'facility' | 'program'

const LAYERS: { value: Layer; label: string }[] = [
  { value: 'opportunity', label: '참여 기회' },
  { value: 'facility', label: '복지시설' },
  { value: 'program', label: '프로그램' },
]

// 시설 대비 프로그램이 적을수록 짙게 (옅은 하늘색 → 짙은 하늘색)
const LIGHT = [238, 246, 255]
const DARK = [132, 193, 250]
const NEUTRAL_FILL = '#f3f4f6'
const rgb = (c: number[]) => `rgb(${c.map((v) => Math.round(v)).join(',')})`
const mix = (t: number) => rgb(LIGHT.map((l, i) => l + (DARK[i] - l) * t))

const MIN_ZOOM = 1
const MAX_ZOOM = 4

/** programsPerFacility가 적을수록 1에 가까운 값을 줍니다. 값이 없으면 null. */
function shadeLevels(stats: DistrictStat[]): Map<District, number | null> {
  const values = stats.map((s) => s.programsPerFacility).filter((v): v is number => v != null)
  const min = Math.min(...values)
  const max = Math.max(...values)
  return new Map(
    stats.map((s) => {
      const v = s.programsPerFacility
      if (v == null) return [s.district, null]
      return [s.district, max === min ? 0.6 : 1 - (v - min) / (max - min)]
    }),
  )
}

export default function BlindSpotMapPage() {
  const [month, setMonth] = useState(() => toYearMonth())
  const [layer, setLayer] = useState<Layer>('opportunity')
  // undefined: 아직 고르지 않음(자료가 오면 가장 짙은 구를 엽니다), null: 패널 닫음
  const [selected, setSelected] = useState<District | null | undefined>(undefined)

  const districts = useQuery({ queryKey: qk.districts(month), queryFn: () => regionApi.districts(month) })
  const markers = useQuery({ queryKey: qk.markers({ month }), queryFn: () => regionApi.markers({ month }) })

  const stats = useMemo(() => districts.data?.districts ?? [], [districts.data])

  const worst = useMemo(() => {
    const rated = stats.filter((s) => s.programsPerFacility != null)
    rated.sort((a, b) => (a.programsPerFacility as number) - (b.programsPerFacility as number))
    return rated[0]?.district ?? stats[0]?.district ?? null
  }, [stats])
  const current = selected === undefined ? worst : selected

  return (
    <div className="flex w-full flex-col">
      <PageHeader title="사각지대 지도" actions={<MonthPicker value={month} onChange={setMonth} />} />

      {districts.isPending ? (
        <LoadingState />
      ) : districts.isError ? (
        <ErrorState error={districts.error} onRetry={() => districts.refetch()} />
      ) : (
        <div className="relative h-[calc(100vh-150px)] min-h-[620px] w-full overflow-hidden rounded-2xl bg-gray-50">
          <MapCanvas
            stats={stats}
            markers={markers.data}
            layer={layer}
            selected={current}
            panelOpen={!!current}
            onSelect={(d) => setSelected(d)}
          />

          <div className="absolute top-5 left-5 rounded-xl shadow-[0_1px_3px_rgba(17,24,39,0.08)]">
            <SegmentedTabs items={LAYERS} value={layer} onChange={setLayer} />
          </div>

          {markers.isPending && (
            <div className="absolute top-[72px] left-5 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[12.5px] text-gray-500 shadow-sm">
              <Spinner className="size-3.5" />
              지도 표시점을 불러오는 중이에요
            </div>
          )}
          {markers.isError && (
            <button
              type="button"
              onClick={() => markers.refetch()}
              className="absolute top-[72px] left-5 rounded-lg bg-white px-3 py-2 text-[12.5px] text-red-500 shadow-sm"
            >
              표시점을 불러오지 못했어요 · 다시 시도
            </button>
          )}

          <Legend layer={layer} />

          {current && (
            <RegionPanel
              key={current}
              district={current}
              month={month}
              stats={stats}
              onClose={() => setSelected(null)}
              className="absolute top-5 right-5 max-h-[calc(100%-40px)]"
            />
          )}
        </div>
      )}
    </div>
  )
}

/* ───────── SVG 지도 ───────── */

function MapCanvas({
  stats,
  markers,
  layer,
  selected,
  panelOpen,
  onSelect,
}: {
  panelOpen: boolean
  stats: DistrictStat[]
  markers: Markers | undefined
  layer: Layer
  selected: District | null
  onSelect: (d: District) => void
}) {
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 1000, h: 700 })
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState<[number, number]>([VIEW_W / 2, VIEW_H / 2])
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const vbW = VIEW_W / zoom
  const vbH = VIEW_H / zoom
  // 화면 1px이 viewBox 몇 단위인지 (preserveAspectRatio="xMidYMid meet")
  const k = Math.max(vbW / Math.max(size.w, 1), vbH / Math.max(size.h, 1))
  const viewBox = `${center[0] - vbW / 2} ${center[1] - vbH / 2} ${vbW} ${vbH}`

  const levels = useMemo(() => shadeLevels(stats), [stats])
  const statOf = (d: District) => stats.find((s) => s.district === d)

  const facilities = useMemo(
    () => (markers?.facilities ?? []).filter((f) => inBounds(f.longitude, f.latitude)).map((f) => ({ ...f, xy: project(f.longitude, f.latitude) })),
    [markers],
  )
  const programs = useMemo(
    () => (markers?.programs ?? []).filter((p) => inBounds(p.longitude, p.latitude)).map((p) => ({ ...p, xy: project(p.longitude, p.latitude) })),
    [markers],
  )

  const changeZoom = (next: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
    setZoom(z)
    if (z === 1) setCenter([VIEW_W / 2, VIEW_H / 2])
  }

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, cx: center[0], cy: center[1], moved: false }
  }
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d || zoom === 1) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    if (!d.moved) e.currentTarget.setPointerCapture(e.pointerId)
    d.moved = true
    setCenter([d.cx - dx * k, d.cy - dy * k])
  }
  const onPointerUp = () => {
    setTimeout(() => (drag.current = null), 0)
  }
  const wasDragged = () => drag.current?.moved === true

  const showFacilities = layer !== 'program'
  const showPrograms = layer !== 'facility'

  return (
    <div ref={wrapRef} className={cn('absolute inset-y-0 left-0 pt-16 pb-14 transition-[right]', panelOpen ? 'right-[360px]' : 'right-0')}>
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className={cn('size-full touch-none select-none', zoom > 1 && 'cursor-grab active:cursor-grabbing')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label="용인시 구별 참여 사각지대 지도"
      >
        {DISTRICT_SHAPES.map((s) => {
          const level = levels.get(s.district)
          const fill = layer === 'opportunity' ? (level == null ? NEUTRAL_FILL : mix(level)) : '#ffffff'
          const active = selected === s.district
          return (
            <path
              key={s.district}
              d={s.path}
              fill={fill}
              stroke={active ? '#2e90fa' : '#ffffff'}
              strokeWidth={(active ? 2.5 : 2) * k}
              strokeLinejoin="round"
              className="cursor-pointer transition-[fill] hover:brightness-[0.97]"
              onClick={() => !wasDragged() && onSelect(s.district)}
            >
              <title>{s.name}</title>
            </path>
          )
        })}
        {/* 선택한 구 테두리를 맨 위에 다시 그립니다 */}
        {selected && (
          <path
            d={DISTRICT_SHAPES.find((s) => s.district === selected)?.path}
            fill="none"
            stroke="#2e90fa"
            strokeWidth={2.5 * k}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        )}

        {showFacilities &&
          facilities.map((f, i) => (
            <rect
              key={`f${i}`}
              x={f.xy[0] - 4.5 * k}
              y={f.xy[1] - 4.5 * k}
              width={9 * k}
              height={9 * k}
              rx={2 * k}
              fill="#111827"
              fillOpacity={0.85}
              stroke="#ffffff"
              strokeWidth={1 * k}
            >
              <title>{`${f.name} · ${f.facilityType}${f.emdName ? ` · ${f.emdName}` : ''}`}</title>
            </rect>
          ))}

        {showPrograms &&
          programs.map((p) => (
            <circle
              key={`p${p.programId}`}
              cx={p.xy[0]}
              cy={p.xy[1]}
              r={5 * k}
              fill={p.accessible ? '#2e90fa' : '#ffffff'}
              stroke="#2e90fa"
              strokeWidth={(p.accessible ? 1 : 1.8) * k}
              className="cursor-pointer"
              onClick={() => !wasDragged() && navigate(`/app/programs/${p.programId}`)}
            >
              <title>{`${p.title}${p.venueName ? ` · ${p.venueName}` : ''}${p.accessible ? ' · 접근성 정보 있음' : ' · 접근성 정보 없음'}`}</title>
            </circle>
          ))}

        {DISTRICT_SHAPES.map((s) => {
          const stat = statOf(s.district)
          const active = selected === s.district
          const count = layer === 'facility' ? `시설 ${stat?.facilityCount ?? 0}` : `프로그램 ${stat?.programCount ?? 0}`
          return (
            <g
              key={`label-${s.district}`}
              transform={`translate(${s.label[0]} ${s.label[1]}) scale(${k})`}
              className="cursor-pointer"
              onClick={() => !wasDragged() && onSelect(s.district)}
            >
              <rect x={-66} y={-17} width={133} height={34} rx={17} fill={active ? '#111827' : '#ffffff'} stroke={active ? 'none' : '#e5e7eb'} />
              <text x={-53} y={5} fontSize={13.5} fontWeight={700} fill={active ? '#ffffff' : '#111827'}>
                {s.name}
              </text>
              <text x={-11} y={5} fontSize={13} fill={active ? '#d1d5db' : '#6b7280'}>
                {count}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="absolute bottom-[118px] left-5 flex w-[38px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
        <button
          type="button"
          aria-label="확대"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => changeZoom(zoom * 1.5)}
          className="flex size-9 items-center justify-center hover:bg-gray-50 disabled:opacity-40"
        >
          <img src={plusIcon} alt="" />
        </button>
        <button
          type="button"
          aria-label="축소"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => changeZoom(zoom / 1.5)}
          className="flex size-9 items-center justify-center border-t border-gray-200 hover:bg-gray-50 disabled:opacity-40"
        >
          <img src={minusIcon} alt="" />
        </button>
      </div>
    </div>
  )
}

/* ───────── 범례 ───────── */

function Legend({ layer }: { layer: Layer }) {
  return (
    <div className="absolute bottom-5 left-5 flex max-w-[calc(100%-40px)] flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-xl border border-gray-200 bg-white px-[15px] py-3 text-[12.5px] text-gray-600">
      {layer !== 'program' && (
        <span className="flex items-center gap-1.5">
          <span className="size-[9px] rounded-[2px] bg-gray-900/85" />
          장애인복지시설
        </span>
      )}
      {layer !== 'facility' && (
        <>
          <span className="flex items-center gap-1.5">
            <span className="size-[9px] rounded-full bg-brand" />
            접근성 정보 있는 프로그램
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-[9px] rounded-full border-[1.5px] border-brand bg-white" />
            접근성 정보 없는 프로그램
          </span>
        </>
      )}
      {layer === 'opportunity' && (
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-12 rounded-full" style={{ background: `linear-gradient(90deg, ${mix(0)}, ${mix(1)})` }} />
          시설 대비 프로그램이 적을수록 짙어요
        </span>
      )}
    </div>
  )
}
