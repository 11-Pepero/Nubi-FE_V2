import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

type Tone = 'white' | 'gray' | 'brand' | 'amber' | 'red' | 'green' | 'solidBrand' | 'dark'

const TONE: Record<Tone, string> = {
  white: 'bg-white text-gray-700',
  gray: 'bg-gray-100 text-gray-700',
  brand: 'bg-brand-soft text-brand',
  amber: 'bg-amber-50 text-amber-500',
  red: 'bg-red-50 text-red-500',
  green: 'bg-green-50 text-green-600',
  solidBrand: 'bg-brand text-white',
  dark: 'bg-gray-900 text-white',
}

/** 28px 높이 라벨 칩 (지원 항목, 상태 배지). */
export function Chip({
  tone = 'gray',
  size = 'md',
  className,
  children,
}: {
  tone?: Tone
  size?: 'sm' | 'md'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center font-medium whitespace-nowrap',
        size === 'md' ? 'h-7 rounded-lg px-2.5 text-[12.5px]' : 'h-6 rounded-md px-2 text-xs',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
