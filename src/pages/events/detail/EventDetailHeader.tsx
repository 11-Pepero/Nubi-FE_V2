// 행사 상세 공통 머리 (화면 12·13·14·16): 뒤로가기, 날짜·장소·D-day, 제목, 행사 수정 / 신청 마감하기, 탭
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import { Button, Modal, UnderlineTabs, useToast, type TabItem } from '@/components/ui'
import { PROGRAM_STATUS_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { dDay, parseDate } from '@/lib/format'
import { formatShortDateTime, totalApplications, useApplicationList, useEventProgram } from './utils'
import iconBack from '@/assets/icons/event-detail-back.svg'

export type EventDetailTab = 'applications' | 'needs' | 'reviews' | 'info'

function dDayText(startAt: string | null | undefined): string | null {
  const d = parseDate(startAt)
  if (!d) return null
  const text = dDay(startAt)
  return text === '마감' ? '끝난 행사' : text
}

export function EventDetailHeader({ eventId, active }: { eventId: number; active: EventDetailTab }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirmClose, setConfirmClose] = useState(false)

  const program = useEventProgram(eventId)
  const list = useApplicationList(eventId)
  const total = totalApplications(list.data)

  const close = useMutation({
    mutationFn: () => eventApi.close(eventId),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.program(eventId), data)
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      setConfirmClose(false)
      toast.show('신청을 마감했어요')
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  const p = program.data
  const meta = p
    ? [formatShortDateTime(p.startAt), p.venue?.name, dDayText(p.startAt)].filter(Boolean).join(' · ')
    : program.isError
      ? '행사 정보를 불러오지 못했어요'
      : ' '

  const tabs: TabItem<EventDetailTab>[] = [
    { value: 'applications', label: '신청 기관', count: total },
    { value: 'needs', label: '필요 지원 모아보기' },
    { value: 'reviews', label: '후기' },
    { value: 'info', label: '행사 정보' },
  ]

  const goTab = (tab: EventDetailTab) => {
    if (tab === active) return
    navigate(tab === 'info' ? `/app/events/${eventId}/edit` : `/app/events/${eventId}/${tab}`)
  }

  return (
    <>
      <div className="flex w-full items-center gap-2.5 pb-4">
        <button
          type="button"
          aria-label="내 행사 목록으로"
          onClick={() => navigate('/app/events')}
          className="-ml-1 flex size-[30px] shrink-0 items-center justify-center rounded-lg hover:bg-gray-100"
        >
          <img src={iconBack} alt="" width={22} height={22} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-[13px] font-medium text-gray-500">{meta}</p>
          <h1 className="truncate text-[26px] font-bold text-gray-900">
            {p?.title ?? (program.isLoading ? '불러오는 중…' : '행사')}
          </h1>
        </div>
        {p && p.status !== 'OPEN' && (
          <span className="shrink-0 text-[13px] font-medium text-gray-400">{PROGRAM_STATUS_LABEL[p.status]}</span>
        )}
        <Button variant="outline" onClick={() => navigate(`/app/events/${eventId}/edit`)}>
          행사 수정
        </Button>
        {p?.status === 'OPEN' && (
          <Button variant="outline" onClick={() => setConfirmClose(true)}>
            신청 마감하기
          </Button>
        )}
      </div>

      <UnderlineTabs items={tabs} value={active} onChange={goTab} />

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="신청을 마감할까요?"
        width={420}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmClose(false)}>
              취소
            </Button>
            <Button loading={close.isPending} onClick={() => close.mutate()}>
              신청 마감하기
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-[1.6] text-gray-600">
          마감하면 다른 기관이 더 이상 이 행사에 신청할 수 없어요. 이미 들어온 신청은 그대로 볼 수 있어요.
        </p>
      </Modal>
    </>
  )
}
