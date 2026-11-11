import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/format'

export function Field({ label, hint, error, children, className }: { label?: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    // 너비는 className으로 정할 수 있게, 따로 주지 않을 때만 w-full을 씁니다.
    <label className={cn('flex min-w-0 flex-col gap-2', className ?? 'w-full')}>
      {label && <span className="text-[13px] font-bold text-gray-900">{label}</span>}
      {children}
      {error ? <span className="text-xs text-red-500">{error}</span> : hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
    </label>
  )
}

const base =
  'w-full rounded-xl border border-gray-200 bg-white px-4 text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-gray-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(base, 'h-12', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(base, 'min-h-24 py-3 leading-[1.6]', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...rest }, ref) {
  return <select ref={ref} className={cn(base, 'h-12 pr-8', className)} {...rest} />
})
