import type { ReactNode } from 'react'
import { errorMessage } from '@/api/client'
import { Button } from './Button'
import { cn } from '@/lib/format'

export function Spinner({ className }: { className?: string }) {
  return <span className={cn('inline-block size-5 animate-spin rounded-full border-2 border-gray-300 border-r-transparent', className)} />
}

export function LoadingState({ label = '불러오는 중이에요', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex w-full flex-col items-center justify-center gap-3 py-16 text-[13px] text-gray-500', className)}>
      <Spinner />
      {label}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex w-full flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      <p className="text-[14px] font-bold text-gray-900">불러오지 못했어요</p>
      <p className="text-[13px] text-gray-500">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, description, action, className }: { title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex w-full flex-col items-center justify-center gap-2 rounded-2xl bg-gray-50 px-6 py-14 text-center', className)}>
      <p className="text-[15px] font-bold text-gray-900">{title}</p>
      {description && <p className="text-[13px] leading-[1.6] text-gray-500">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
