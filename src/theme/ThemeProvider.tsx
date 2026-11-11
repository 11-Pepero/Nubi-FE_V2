import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_APPEARANCE,
  STORAGE_KEY,
  THEMES,
  cssVarsFor,
  resolveMode,
  type Appearance,
  type ResolvedMode,
} from './themes'

interface ThemeContextValue {
  appearance: Appearance
  resolvedMode: ResolvedMode
  update: (patch: Partial<Appearance>) => void
  reset: (key?: keyof Appearance) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function load(): Appearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_APPEARANCE
    const saved = JSON.parse(raw) as Partial<Appearance>
    const merged = { ...DEFAULT_APPEARANCE, ...saved }
    if (!THEMES.some((t) => t.id === merged.themeId)) merged.themeId = DEFAULT_APPEARANCE.themeId
    return merged
  } catch {
    return DEFAULT_APPEARANCE
  }
}

function apply(appearance: Appearance, resolved: ResolvedMode) {
  const root = document.documentElement
  root.dataset.mode = resolved
  root.style.colorScheme = resolved
  const vars = cssVarsFor(appearance, resolved)
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  try {
    // 첫 화면 스크립트(index.html)가 새로 고침 때 깜빡이지 않게 쓸 값도 함께 저장합니다.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance))
    localStorage.setItem(`${STORAGE_KEY}.vars`, JSON.stringify({ light: cssVarsFor(appearance, 'light'), dark: cssVarsFor(appearance, 'dark') }))
  } catch {
    /* 저장소를 못 쓰면 이번 방문에만 적용 */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(load)
  const [systemDark, setSystemDark] = useState(() => resolveMode('system') === 'dark')

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolvedMode: ResolvedMode = appearance.mode === 'system' ? (systemDark ? 'dark' : 'light') : appearance.mode

  useEffect(() => apply(appearance, resolvedMode), [appearance, resolvedMode])

  const update = useCallback((patch: Partial<Appearance>) => setAppearance((prev) => ({ ...prev, ...patch })), [])
  const reset = useCallback(
    (key?: keyof Appearance) =>
      setAppearance((prev) => (key ? { ...prev, [key]: DEFAULT_APPEARANCE[key] } : DEFAULT_APPEARANCE)),
    [],
  )

  const value = useMemo(() => ({ appearance, resolvedMode, update, reset }), [appearance, resolvedMode, update, reset])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme은 ThemeProvider 안에서 써야 합니다.')
  return ctx
}
