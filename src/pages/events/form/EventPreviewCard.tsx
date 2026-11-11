import type { Facility, Venue } from '@/api/types'
import { DISTRICT_LABEL, FACILITY_TYPE_LABEL } from '@/lib/labels'
import { dDay } from '@/lib/format'
import { shortDateTime } from '../list/util'
import iconImage from '@/assets/icons/events-image-28.svg'

/** 오른쪽 "미리보기 · 프로그램 카드". */
export function EventPreviewCard({
  title,
  startAt,
  capacity,
  venue,
  facilities,
  supportLabels,
  thumbnailUrl,
}: {
  title: string
  startAt: string | null
  capacity: number | null
  venue: Venue | null
  facilities: Facility[]
  supportLabels: string[]
  thumbnailUrl: string | null
}) {
  const due = startAt ? dDay(startAt) : null
  const meta = [
    startAt ? shortDateTime(startAt) : '날짜 미정',
    venue ? (venue.district ? DISTRICT_LABEL[venue.district] : venue.name) : null,
    capacity ? `정원 ${capacity}명` : null,
  ].filter(Boolean)
  const chips = [
    ...facilities.filter((f) => f.status === 'YES').map((f) => FACILITY_TYPE_LABEL[f.facilityType]),
    ...supportLabels,
  ].slice(0, 6)

  return (
    <div className="flex w-full flex-col gap-2.5 rounded-2xl bg-gray-50 px-5 py-[18px]">
      <div className="flex w-full items-center">
        <p className="min-w-0 flex-1 text-[12.5px] font-medium text-gray-500">미리보기 · 프로그램 카드</p>
        {due && <p className="text-[14px] font-bold text-gray-900">{due}</p>}
      </div>
      <div className="flex h-[150px] w-full items-center justify-center overflow-hidden rounded-[10px] bg-gray-200">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="size-full object-cover" />
        ) : (
          <img src={iconImage} alt="" width={28} height={28} />
        )}
      </div>
      <p className={title ? 'w-full text-[16px] font-bold break-words text-gray-900' : 'w-full text-[16px] font-bold text-gray-400'}>
        {title || '행사 이름'}
      </p>
      <p className="w-full text-[12.5px] whitespace-pre-wrap text-gray-600">{meta.join('  ·  ')}</p>
      {chips.length > 0 && (
        <div className="flex w-full flex-wrap gap-1.5">
          {chips.map((label) => (
            <span key={label} className="flex h-[26px] items-center rounded-[7px] bg-white px-2 text-xs font-medium text-gray-700">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
