import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

/** 회색 판 섹션 (제목 15px 굵게). */
export function SectionCard({ title, aside, children, className }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('flex w-full flex-col gap-3.5 rounded-2xl bg-gray-50 px-6 pt-5 pb-[22px]', className)}>
      <div className="flex w-full items-center gap-2">
        <h2 className="text-[15px] font-bold whitespace-nowrap text-gray-900">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** 12.5px 회색 라벨 + 입력칸. */
export function FormField({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-[12.5px] font-medium whitespace-nowrap text-gray-500">{label}</span>
      {children}
    </label>
  )
}

/** Figma 06 입력칸: 44px, 둥근 12, 글자 13.5px. */
export const inputClass =
  'h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[13.5px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand disabled:bg-gray-50 disabled:text-gray-500'

export const textareaClass =
  'min-h-28 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[13.5px] leading-[1.6] text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand'
