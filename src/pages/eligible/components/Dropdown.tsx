import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/format'
import chevronGray from '@/assets/icons/eligible-chevron-gray.svg'
import chevronBrand from '@/assets/icons/eligible-chevron-brand.svg'

/** 44px 필터 버튼 + 아래로 펼쳐지는 메뉴 (화면 03, 04 위쪽 도구 줄). */
export function Dropdown({
  label,
  active,
  disabled,
  align = 'left',
  menuClassName,
  children,
}: {
  label: ReactNode
  active?: boolean
  disabled?: boolean
  align?: 'left' | 'right'
  menuClassName?: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-11 items-center gap-1.5 rounded-xl border pr-3 pl-3.5 text-[13px] font-medium whitespace-nowrap transition-colors disabled:opacity-50',
          active ? 'border-brand bg-brand-soft text-brand' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
        )}
      >
        {label}
        <img src={active ? chevronBrand : chevronGray} alt="" width={14} height={14} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-30 mt-1.5 flex max-h-80 min-w-full flex-col overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  selected,
  onClick,
  children,
  hint,
}: {
  selected?: boolean
  onClick: () => void
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] whitespace-nowrap hover:bg-gray-50',
        selected ? 'font-bold text-brand' : 'font-medium text-gray-700',
      )}
    >
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs font-normal text-gray-400">{hint}</span>}
    </button>
  )
}
