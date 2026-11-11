// 16 받은 후기 — 백엔드에 후기 API가 아직 없어 머리·탭만 동작하고 본문은 준비 중 안내를 보여 줍니다.
import { useState } from 'react'
import { EmptyState, SegmentedTabs } from '@/components/ui'
import { EventDetailHeader } from './detail/EventDetailHeader'
import { useEventId } from './detail/utils'

type Sort = 'latest' | 'lowest' | 'photo'

export default function EventReviewsPage() {
  const eventId = useEventId()
  const [sort, setSort] = useState<Sort>('latest')

  return (
    <div className="flex w-full flex-col">
      <EventDetailHeader eventId={eventId} active="reviews" />

      <div className="flex w-full items-start gap-5 pt-5">
        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="pointer-events-none opacity-50" aria-disabled="true">
            <SegmentedTabs
              items={[
                { value: 'latest', label: '최신순' },
                { value: 'lowest', label: '별점 낮은 순' },
                { value: 'photo', label: '사진 있는 후기' },
              ]}
              value={sort}
              onChange={setSort}
            />
          </div>
          <EmptyState
            title="후기 기능 준비 중"
            description={
              <>
                행사에 다녀간 기관이 남긴 후기를 여기서 모아 볼 수 있게 준비하고 있어요.
                <br />
                후기가 열리면 별점, 공고와 같았는지, 답글 달기를 이곳에서 할 수 있어요.
              </>
            }
          />
        </section>

        <aside className="flex w-[360px] shrink-0 flex-col gap-2 rounded-2xl bg-gray-50 p-5">
          <h2 className="text-[15px] font-bold text-gray-900">공고에 적힌 대로였나요?</h2>
          <p className="text-[13px] leading-[1.6] text-gray-500">
            후기가 모이면 지원 항목마다 다녀간 기관이 “그랬어요”라고 답한 비율을 보여 드려요.
          </p>
        </aside>
      </div>
    </div>
  )
}
