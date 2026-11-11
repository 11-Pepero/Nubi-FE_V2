// 받은 후기 오른쪽: 공고에 적힌 대로였나요? · 많이 고른 반응 · AI 후기 요약
import { useQuery } from '@tanstack/react-query'
import { eventApi } from '@/api/endpoints'
import type { ReceivedReviews } from '@/api/types'
import { Button, Spinner } from '@/components/ui'
import { errorMessage } from '@/api/client'
import { REVIEW_REACTION_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'

const panel = 'flex flex-col gap-3 rounded-2xl bg-gray-50 p-5'

export function CheckBars({ checks }: { checks: ReceivedReviews['checks'] }) {
  return (
    <div className={panel}>
      <h2 className="text-[15px] font-bold text-gray-900">공고에 적힌 대로였나요?</h2>
      {checks.length === 0 ? (
        <p className="text-[13px] leading-[1.6] text-gray-500">
          후기가 모이면 지원 항목마다 다녀간 기관이 “그랬어요”라고 답한 비율을 보여 드려요.
        </p>
      ) : (
        checks.map((c) => {
          const answered = c.yesCount + c.noCount
          const total = answered + c.unknownCount
          const yesPct = total ? (c.yesCount / total) * 100 : 0
          const noPct = total ? (c.noCount / total) * 100 : 0
          return (
            <div key={c.supportTagId} className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-gray-900">{c.label}</span>
                <span className="shrink-0 text-xs text-gray-500">
                  그랬어요 {c.yesCount} · 아니었어요 {c.noCount}
                  {c.unknownCount > 0 ? ` · 몰라요 ${c.unknownCount}` : ''}
                </span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full bg-green-500" style={{ width: `${yesPct}%` }} />
                <div className="h-full bg-red-400" style={{ width: `${noPct}%` }} />
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

export function ReactionCounts({ reactions }: { reactions: ReceivedReviews['reactions'] }) {
  const shown = reactions.filter((r) => r.count > 0).sort((a, b) => b.count - a.count)
  if (shown.length === 0) return null
  return (
    <div className={panel}>
      <h2 className="text-[15px] font-bold text-gray-900">다녀간 기관의 반응</h2>
      <div className="flex flex-col gap-2">
        {shown.map((r) => (
          <div key={r.reaction} className="flex items-center gap-2 text-[13.5px]">
            <span className="flex-1 text-gray-700">{REVIEW_REACTION_LABEL[r.reaction]}</span>
            <span className="font-bold text-gray-900">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** AI 요약은 몇 초 걸릴 수 있어 목록과 따로 불러옵니다. */
export function ReviewSummaryPanel({ eventId }: { eventId: number }) {
  const query = useQuery({
    queryKey: qk.eventReviewSummary(eventId),
    queryFn: () => eventApi.reviewSummary(eventId),
    staleTime: 5 * 60_000,
  })

  if (query.isPending) {
    return (
      <div className={panel}>
        <h2 className="text-[15px] font-bold text-gray-900">후기 요약</h2>
        <div className="flex items-center gap-2 text-[13px] text-gray-500">
          <Spinner className="size-4" />
          후기를 읽고 요약하는 중이에요
        </div>
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className={panel}>
        <h2 className="text-[15px] font-bold text-gray-900">후기 요약</h2>
        <p className="text-[13px] text-gray-500">{errorMessage(query.error)}</p>
        <div>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  const s = query.data
  if (s.reviewCount === 0) return null

  return (
    <div className={panel}>
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[15px] font-bold text-gray-900">후기 요약</h2>
        <span className="text-xs text-gray-400">{s.aiWritten ? `AI가 후기 ${s.reviewCount}개를 읽었어요` : 'AI 없이 집계로 만든 요약'}</span>
      </div>
      {s.summary && <p className="text-[13.5px] leading-[1.65] whitespace-pre-line text-gray-800">{s.summary}</p>}

      {s.improvements.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-bold text-gray-900">다음에 바꿔 볼 점</p>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-[13px] leading-[1.6] text-gray-700">
            {s.improvements.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {s.conditionAlerts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-bold text-gray-900">공고와 달랐다는 항목</p>
          {s.conditionAlerts.map((a) => (
            <div key={a.supportTagId} className="flex flex-col gap-0.5 rounded-xl bg-amber-50 px-3.5 py-2.5">
              <span className="text-[13px] font-bold text-amber-700">
                {a.label} <span className="font-medium">· 아니었어요 {a.noCount} / 그랬어요 {a.yesCount}</span>
              </span>
              <span className="text-[12.5px] leading-[1.55] text-amber-700">{a.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
