import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/format'

/** 가운데 뜨는 대화 상자. ESC나 바깥을 누르면 닫힙니다. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: number
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        style={{ width }}
        className={cn('glass-surface flex max-h-[90vh] max-w-full flex-col overflow-hidden rounded-2xl shadow-xl', className)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && <div className="px-6 pt-6 pb-2 text-[17px] font-bold text-gray-900">{title}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
