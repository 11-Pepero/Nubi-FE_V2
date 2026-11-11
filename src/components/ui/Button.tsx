import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/format'

type Variant = 'primary' | 'outline' | 'soft' | 'ghost' | 'dark' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong disabled:bg-gray-200 disabled:text-gray-400',
  outline: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:text-gray-400',
  soft: 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:text-gray-400',
  ghost: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:text-gray-300',
  dark: 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300',
  danger: 'bg-white border border-gray-200 text-red-500 hover:bg-red-50',
}

// Figma: 32px(rounded 16), 36px(rounded 18), 48px(rounded 12, 폼 제출)
const SIZE: Record<Size, string> = {
  sm: 'h-8 px-4 rounded-2xl text-[13px]',
  md: 'h-9 px-4 rounded-[18px] text-[13px]',
  lg: 'h-12 px-5 rounded-xl text-[15px] font-bold',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}
      {children}
    </button>
  )
}
