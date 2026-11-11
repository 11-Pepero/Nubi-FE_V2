import { useNavigate } from 'react-router-dom'
import type { EventSummary, ProgramStatus } from '@/api/types'
import { resolveAssetUrl } from '@/api/client'
import { Button } from '@/components/ui'
import { PROGRAM_STATUS_LABEL } from '@/lib/labels'
import { cn, dDay } from '@/lib/format'
import { eventLink, shortDateTime } from './util'
import iconImage from '@/assets/icons/events-image.svg'

const STATUS_TONE: Record<ProgramStatus, string> = {
  OPEN: 'bg-brand-soft text-brand',
  CLOSED: 'bg-gray-100 text-gray-600',
  ENDED: 'bg-gray-100 text-gray-500',
  DRAFT: 'bg-amber-50 text-amber-600',
}

/** 행사 카드 한 줄 (사진 · 제목/날짜/정원 막대 · 숫자 3개 · 버튼). */
export function EventRow({ event }: { event: EventSummary }) {
  const navigate = useNavigate()
  const thumb = resolveAssetUrl(event.thumbnailUrl)
  const isDraft = event.status === 'DRAFT'
  const canEdit = event.status !== 'ENDED'
  const ratio = event.capacity ? Math.min(1, event.participantCount / event.capacity) : 0
  const due = event.status === 'ENDED' ? null : dDay(event.startAt)
  const place = event.venue?.name

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(eventLink(event))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(eventLink(event))
      }}
      className="flex w-full cursor-pointer items-center gap-5 rounded-2xl bg-gray-50 py-4 pr-5 pl-4 transition-colors hover:bg-gray-100"
    >
      <div className="flex h-[92px] w-[132px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-200">
        {thumb ? (
          <img src={thumb} alt="" className="size-full object-cover" />
        ) : (
          <img src={iconImage} alt="" width={22} height={22} />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-[16px] font-bold text-gray-900">{event.title}</p>
          <span className={cn('inline-flex h-[26px] shrink-0 items-center rounded-[7px] px-2 text-xs font-medium', STATUS_TONE[event.status])}>
            {PROGRAM_STATUS_LABEL[event.status]}
          </span>
          {due && <span className="shrink-0 text-[13px] font-bold text-gray-500">{due}</span>}
        </div>
        <p className="truncate text-[13px] text-gray-500">
          {shortDateTime(event.startAt)}
          {place ? ` · ${place}` : ''}
        </p>
        <div className="flex items-center gap-2.5 pt-1">
          <div className="relative h-1.5 w-[220px] shrink-0 overflow-hidden rounded-[3px] bg-gray-200">
            <div className="absolute inset-y-0 left-0 rounded-[3px] bg-brand" style={{ width: `${ratio * 100}%` }} />
          </div>
          <span className="text-[12.5px] font-medium whitespace-nowrap text-gray-700">
            {event.participantCount}
            {event.capacity ? ` / ${event.capacity}명` : '명'}
          </span>
        </div>
      </div>

      {!isDraft && (
        <div className="flex shrink-0 items-center gap-6">
          <Stat label="신청 기관" value={`${event.applicationOrgCount}곳`} />
          <Stat label="참여 인원" value={`${event.participantCount}명`} />
          <Stat label="새 신청" value={`${event.newApplicationCount}건`} brand />
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {isDraft ? (
          <Button onClick={() => navigate(`/app/events/${event.eventId}/edit`)}>이어서 쓰기</Button>
        ) : (
          <>
            {canEdit && (
              <button
                type="button"
                onClick={() => navigate(`/app/events/${event.eventId}/edit`)}
                className="px-1 text-[13px] font-medium text-gray-500 hover:text-gray-900"
              >
                수정
              </button>
            )}
            <Button onClick={() => navigate(`/app/events/${event.eventId}/applications`)}>신청 보기</Button>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, brand }: { label: string; value: string; brand?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 whitespace-nowrap">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={brand ? 'text-[17px] font-bold text-brand' : 'text-[17px] font-bold text-gray-900'}>{value}</span>
    </div>
  )
}
