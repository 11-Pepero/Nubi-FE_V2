import { useEffect, useState } from 'react'
import { cn } from '@/lib/format'

/**
 * AI가 글을 쓰는 동안 보여 주는 진행 표시: 반짝이는 AI 아이콘, 차오르는 퍼센트 게이지, 지금 하는 일.
 * 서버가 진행률을 주지 않아 걸리는 시간(expectedMs)으로 어림합니다. 끝나기 전에는 95%를 넘지 않고,
 * 예상보다 오래 걸리면 천천히 다가가기만 해서 멈춘 것처럼 보이지 않아요.
 */
export function AiProgress({
  title,
  steps,
  expectedMs = 12_000,
  className,
}: {
  title: string
  /** 진행률 구간마다 보여 줄 문구 (순서대로) */
  steps: string[]
  expectedMs?: number
  className?: string
}) {
  const percent = useEstimatedPercent(expectedMs)
  const step = steps[Math.min(steps.length - 1, Math.floor((percent / 100) * steps.length))]

  return (
    <div
      role="progressbar"
      aria-label={title}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-valuetext={`${Math.round(percent)}% · ${step}`}
      className={cn(
        'nubi-ai-card flex w-full flex-col gap-3 rounded-2xl border border-brand/20 bg-brand-soft/60 px-4 py-3.5',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <AiSparkle className="size-9 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[14px] font-bold text-gray-900">{title}</p>
          {/* 문구가 바뀔 때마다 살짝 올라오며 나타나요 */}
          <p key={step} className="nubi-ai-step truncate text-[12.5px] text-gray-600" aria-live="polite">
            {step}
          </p>
        </div>
        <span className="shrink-0 text-[20px] font-bold tabular-nums text-brand">{Math.round(percent)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/80">
        <div
          className="nubi-ai-bar h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/** 별 세 개가 반짝이는 AI 아이콘 */
export function AiSparkle({ className }: { className?: string }) {
  return (
    <span className={cn('nubi-ai-sparkle relative inline-flex items-center justify-center', className)} aria-hidden>
      <svg viewBox="0 0 36 36" className="size-full">
        <defs>
          <linearGradient id="nubi-ai-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-brand)" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <path
          className="nubi-ai-star nubi-ai-star-1"
          fill="url(#nubi-ai-grad)"
          d="M15 5c.9 5.4 3.6 8.1 9 9-5.4.9-8.1 3.6-9 9-.9-5.4-3.6-8.1-9-9 5.4-.9 8.1-3.6 9-9Z"
        />
        <path
          className="nubi-ai-star nubi-ai-star-2"
          fill="url(#nubi-ai-grad)"
          d="M27 19c.5 2.9 2 4.4 4.9 4.9-2.9.5-4.4 2-4.9 4.9-.5-2.9-2-4.4-4.9-4.9 2.9-.5 4.4-2 4.9-4.9Z"
        />
        <path
          className="nubi-ai-star nubi-ai-star-3"
          fill="url(#nubi-ai-grad)"
          d="M27.5 3.5c.3 1.8 1.2 2.7 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.3 2.7-1.2 3-3Z"
        />
      </svg>
    </span>
  )
}

/** 시작한 뒤 흐른 시간으로 진행률을 어림합니다: 처음엔 빠르게, 끝으로 갈수록 천천히, 95%까지. */
function useEstimatedPercent(expectedMs: number) {
  const [percent, setPercent] = useState(2)
  useEffect(() => {
    const started = performance.now()
    const id = window.setInterval(() => {
      const t = performance.now() - started
      // 예상 시간에 약 90%에 닿는 곡선
      const next = 95 * (1 - Math.exp((-2.6 * t) / expectedMs))
      setPercent(Math.max(2, Math.min(95, next)))
    }, 120)
    return () => window.clearInterval(id)
  }, [expectedMs])
  return percent
}
