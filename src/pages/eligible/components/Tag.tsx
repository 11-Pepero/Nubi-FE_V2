import type { ReactNode } from 'react'
import type { EligibilityResult } from '@/api/types'
import { ELIGIBILITY_RESULT_LABEL } from '@/lib/labels'
import { cn } from '@/lib/format'

type TagTone = 'white' | 'gray' | 'soft' | 'brand' | 'amber' | 'red'

const TONE: Record<TagTone, string> = {
  white: 'bg-white text-gray-700',
  gray: 'bg-gray-200 text-gray-600',
  soft: 'bg-gray-100 text-gray-600',
  brand: 'bg-brand-soft text-brand',
  amber: 'bg-amber-50 text-amber-500',
  red: 'bg-red-50 text-red-500',
}

/** 26px 작은 칩 (카드의 지원 칩, 조건 칩). 결과 배지는 28px. */
export function Tag({ tone = 'white', tall, className, children }: { tone?: TagTone; tall?: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-[7px] px-2 text-xs font-medium whitespace-nowrap',
        tall ? 'h-7' : 'h-[26px]',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const RESULT_TONE: Record<EligibilityResult, TagTone> = { ELIGIBLE: 'brand', CHECK: 'amber', NOT: 'red' }

/** size="pill": 카드 아래 줄의 버튼과 같은 36px 알약 모양 */
export function ResultBadge({ result, tall = true, size }: { result: EligibilityResult; tall?: boolean; size?: 'pill' }) {
  if (size === 'pill') {
    return (
      <span
        className={cn(
          'inline-flex h-9 shrink-0 items-center rounded-[18px] px-3.5 text-[13px] font-medium whitespace-nowrap',
          TONE[RESULT_TONE[result]],
        )}
      >
        {ELIGIBILITY_RESULT_LABEL[result]}
      </span>
    )
  }
  return (
    <Tag tone={RESULT_TONE[result]} tall={tall}>
      {ELIGIBILITY_RESULT_LABEL[result]}
    </Tag>
  )
}
