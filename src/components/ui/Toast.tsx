import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/format'

interface ToastItem {
  id: number
  message: ReactNode
  tone: 'default' | 'error'
  action?: { label: string; onClick: () => void }
}

interface ToastApi {
  show: (message: ReactNode, opts?: { tone?: 'default' | 'error'; action?: ToastItem['action']; duration?: number }) => void
}

const Ctx = createContext<ToastApi | null>(null)
let seq = 0

/** 화면 아래 가운데 검은 알림 (화면 10 아래). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback<ToastApi['show']>((message, opts) => {
    const id = ++seq
    setItems((prev) => [...prev, { id, message, tone: opts?.tone ?? 'default', action: opts?.action }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), opts?.duration ?? 3500)
  }, [])

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-7 z-[60] flex flex-col items-center gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex min-h-12 items-center gap-3 rounded-xl px-5 py-2 text-[13.5px] font-medium text-white shadow-lg',
              t.tone === 'error' ? 'bg-red-500' : 'bg-gray-900',
            )}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                className="h-8 rounded-lg bg-white/15 px-3 text-[13px] hover:bg-white/25"
                onClick={() => {
                  t.action?.onClick()
                  setItems((prev) => prev.filter((x) => x.id !== t.id))
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast는 ToastProvider 안에서 써야 합니다.')
  return ctx
}
