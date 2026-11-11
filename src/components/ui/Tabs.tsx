import { cn } from '@/lib/format'

export interface TabItem<T extends string> {
  value: T
  label: string
  count?: number | null
}

/** 밑줄 탭 (화면 01, 05, 12 위쪽). 고른 탭은 검은 밑줄과 파란 숫자. */
export function UnderlineTabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn('flex w-full gap-1 border-b border-gray-200', className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px flex h-10 items-center gap-1.5 border-b-2 px-3 font-medium whitespace-nowrap',
              active ? 'border-gray-900' : 'border-transparent',
            )}
          >
            <span className={cn('text-[13.5px]', active ? 'text-gray-900' : 'text-gray-500')}>{item.label}</span>
            {item.count != null && (
              <span className={cn('text-xs', active ? 'text-brand' : 'text-gray-400')}>{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** 회색 판 위 흰 알약 탭 (화면 03 오른쪽, 12 표 위). */
export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn('inline-flex items-center gap-0.5 rounded-xl bg-gray-100 p-1', className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'h-7 rounded-lg px-3 text-[12.5px] whitespace-nowrap',
              active ? 'bg-white font-bold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'font-medium text-gray-500',
            )}
          >
            {item.label}
            {item.count != null && ` ${item.count}`}
          </button>
        )
      })}
    </div>
  )
}
