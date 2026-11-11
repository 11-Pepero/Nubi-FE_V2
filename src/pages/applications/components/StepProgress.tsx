import type { ApplicationStatus, ApplicationStep } from '@/api/types'
import { APPLICATION_STATUS_LABEL, APPLICATION_STEP_LABEL } from '@/lib/labels'
import { Chip } from '@/components/ui'
import { cn } from '@/lib/format'
import dotDone from '@/assets/icons/applications-step-done.svg'
import dotCurrent from '@/assets/icons/applications-step-current.svg'
import dotTodo from '@/assets/icons/applications-step-todo.svg'

const STEPS: ApplicationStep[] = ['PREPARE', 'SUBMIT', 'ATTEND', 'REVIEW']

/** 준비 → 접수 → 참여 → 후기 진행 표시 (화면 05 행 가운데). 거절·취소(ENDED)는 상태 칩으로 보여 줍니다. */
export function StepProgress({ step, status }: { step: ApplicationStep; status: ApplicationStatus }) {
  if (step === 'ENDED') {
    return (
      <Chip tone={status === 'REJECTED' ? 'red' : 'gray'} size="sm">
        {APPLICATION_STATUS_LABEL[status]}
      </Chip>
    )
  }
  const current = STEPS.indexOf(step)
  return (
    <div className="flex h-6 items-center gap-1">
      {STEPS.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        return (
          <div key={s} className="flex items-center gap-1">
            {i > 0 && <span className={cn('h-[1.5px] w-3.5', i <= current ? 'bg-brand' : 'bg-gray-200')} />}
            <img src={state === 'done' ? dotDone : state === 'current' ? dotCurrent : dotTodo} alt="" className="size-2" />
            <span
              className={cn(
                'text-xs whitespace-nowrap',
                state === 'current' ? 'font-bold text-gray-900' : state === 'done' ? 'text-gray-900' : 'text-gray-400',
              )}
            >
              {APPLICATION_STEP_LABEL[s]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
