import { Fragment } from 'react'
import { cn } from '@/lib/format'
import stepCheckIcon from '@/assets/icons/auth-step-check.svg'

const STEPS = ['기관 정보', '담당자 계정', '가입 완료'] as const

/** 가입 화면 맨 위 3단계 표시. step은 1부터 셉니다. */
export function SignUpSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="flex w-full items-center gap-2" aria-label={`가입 ${step}단계 / 3단계`}>
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < step
        const current = n === step
        return (
          <Fragment key={label}>
            {i > 0 && <li aria-hidden className={cn('h-0.5 min-w-4 flex-1 rounded-full', n <= step ? 'bg-brand' : 'bg-gray-200')} />}
            <li className="flex shrink-0 items-center gap-2" aria-current={current ? 'step' : undefined}>
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-[12.5px] font-bold',
                  done || current ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400',
                )}
              >
                {done ? <img src={stepCheckIcon} alt="" /> : n}
              </span>
              <span className={cn('text-[14px] whitespace-nowrap', current ? 'font-bold text-gray-900' : done ? 'font-medium text-gray-700' : 'text-gray-400')}>
                {label}
              </span>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
