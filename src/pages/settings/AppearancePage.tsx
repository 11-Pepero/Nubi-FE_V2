// 화면 설정: 모드(시스템/라이트/다크), 색상 테마, 명암, 메뉴·대화 상자 불투명도
import type { ReactNode } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import {
  CONTRAST_RANGE,
  DEFAULT_APPEARANCE,
  GLASS_RANGE,
  THEMES,
  type AccentSet,
  type ColorMode,
  type ThemeDef,
  previewPalette,
  mixHex,
} from '@/theme/themes'
import { cn } from '@/lib/format'

const MODES: { value: ColorMode; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
]

export default function AppearancePage() {
  const { appearance, resolvedMode, update, reset } = useTheme()
  const theme = THEMES.find((t) => t.id === appearance.themeId) ?? THEMES[0]

  return (
    <div className="nubi-page-enter mx-auto flex w-full max-w-[960px] flex-col gap-12 pb-10">
      <nav className="flex items-center gap-2 text-[14px]">
        <span className="text-gray-500">설정</span>
        <span className="text-gray-300">/</span>
        <span className="font-bold text-gray-900">화면</span>
      </nav>

      {/* 모드 */}
      <Section title="화면 모드" description="시스템을 고르면 기기 설정을 따라 라이트와 다크가 바뀌어요.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MODES.map((m) => {
            const active = appearance.mode === m.value
            return (
              <button
                key={m.value}
                onClick={() => update({ mode: m.value })}
                aria-pressed={active}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border bg-gray-50 p-3 text-left transition-shadow',
                  active ? 'border-brand ring-2 ring-brand/30' : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <ModePreview mode={m.value} theme={theme} />
                <span className={cn('pb-1 text-center text-[14px]', active ? 'font-bold text-gray-900' : 'font-medium text-gray-500')}>
                  {m.label}
                  {m.value === 'system' && active && (
                    <span className="ml-1 text-xs font-medium text-gray-400">(지금 {resolvedMode === 'dark' ? '다크' : '라이트'})</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* 색상 테마 */}
      <Section title="색상 테마" description="버튼, 링크, 강조 숫자에 쓰는 색이에요. 동그라미는 라이트 / 다크 모드 모습이에요.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => {
            const active = t.id === appearance.themeId
            return (
              <button
                key={t.id}
                onClick={() => update({ themeId: t.id })}
                aria-pressed={active}
                className={cn(
                  'flex flex-col gap-5 rounded-2xl border bg-gray-50 px-5 pt-6 pb-4 text-left transition-shadow',
                  active ? 'border-brand ring-2 ring-brand/30' : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <div className="flex items-center justify-center gap-5">
                  <Swatch background={t.swatch.light} selected={active && resolvedMode === 'light'} icon="sun" active={active} />
                  <Swatch background={t.swatch.dark} selected={active && resolvedMode === 'dark'} icon="moon" active={active} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[15px] font-bold text-gray-900">{t.name}</span>
                  <span className="size-3 rounded-full" style={{ background: t[resolvedMode].brand }} />
                </div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* 세부 조절 */}
      <Section title="세부 조절">
        <div className="flex flex-col divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200">
          <SliderRow
            label="명암"
            description="글자와 테두리 색을 더 진하게, 또는 더 부드럽게 바꿔요."
            value={appearance.contrast}
            min={CONTRAST_RANGE.min}
            max={CONTRAST_RANGE.max}
            isDefault={appearance.contrast === DEFAULT_APPEARANCE.contrast}
            onChange={(v) => update({ contrast: v })}
            onReset={() => reset('contrast')}
          />
          <SliderRow
            label="불투명도"
            description="값이 높을수록 메뉴, 대화 상자, 알림 창이 더 단단하게 보여요. 낮추면 뒤가 비쳐 보여요."
            value={appearance.glass}
            min={GLASS_RANGE.min}
            max={GLASS_RANGE.max}
            isDefault={appearance.glass === DEFAULT_APPEARANCE.glass}
            onChange={(v) => update({ glass: v })}
            onReset={() => reset('glass')}
          />
        </div>
        <div className="flex justify-end pt-3">
          <button className="text-[13px] font-medium text-gray-500 hover:text-gray-900" onClick={() => reset()}>
            모든 화면 설정 처음으로
          </button>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-[19px] font-bold text-gray-900">{title}</h2>
        {description && <p className="text-[13px] text-gray-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/* ── 모드 미리보기: 사이드바·본문·카드가 있는 작은 앱 화면 ── */

function MiniApp({ mode, theme }: { mode: 'light' | 'dark'; theme: ThemeDef }) {
  const c = previewPalette(theme, mode)
  const accent: AccentSet = theme[mode]
  return (
    <div className="absolute inset-0 flex" style={{ background: c.bg }}>
      <div className="flex w-[26%] flex-col gap-1.5 p-2" style={{ background: c.side, borderRight: `1px solid ${c.line}` }}>
        <span className="h-2.5 rounded-full" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }} />
        <span className="h-2 rounded-full" style={{ background: accent.soft || mixHex(c.side, accent.brand, 22) }} />
        <span className="h-2 rounded-full" style={{ background: c.line }} />
        <span className="h-2 rounded-full" style={{ background: c.line }} />
      </div>
      <div className="relative flex flex-1 flex-col gap-1.5 p-3">
        <span className="ml-auto h-2.5 w-[34%] rounded-full" style={{ background: accent.brand, opacity: 0.85 }} />
        <span className="mt-1 h-1.5 w-[55%] rounded-full" style={{ background: c.bar }} />
        <span className="h-1.5 w-[40%] rounded-full" style={{ background: c.bar }} />
        <div
          className="absolute top-7 right-3 flex w-[30%] flex-col gap-1 rounded-md p-1.5"
          style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
        >
          {['#12b76a', '#ef4444', '#f59e0b'].map((dot) => (
            <span key={dot} className="flex items-center gap-1">
              <span className="size-1 rounded-full" style={{ background: dot }} />
              <span className="h-1 flex-1 rounded-full" style={{ background: c.bar }} />
            </span>
          ))}
        </div>
        <div
          className="absolute right-3 bottom-2.5 left-3 flex h-4 items-center rounded-md px-1.5"
          style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
        >
          <span className="h-1 w-[35%] rounded-full" style={{ background: c.bar }} />
          <span className="ml-auto size-2 rounded-full" style={{ background: accent.brand }} />
        </div>
      </div>
    </div>
  )
}

function ModePreview({ mode, theme }: { mode: ColorMode; theme: ThemeDef }) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-gray-200">
      {mode === 'dark' ? (
        <MiniApp mode="dark" theme={theme} />
      ) : (
        <MiniApp mode="light" theme={theme} />
      )}
      {mode === 'system' && (
        <div className="absolute inset-0" style={{ clipPath: 'polygon(52% 0, 100% 0, 100% 100%, 52% 100%)' }}>
          <MiniApp mode="dark" theme={theme} />
        </div>
      )}
    </div>
  )
}

function Swatch({ background, selected, icon, active }: { background: string; selected: boolean; icon: 'sun' | 'moon'; active: boolean }) {
  return (
    <span className={cn('relative rounded-full p-[3px]', selected ? 'ring-2 ring-brand' : active ? 'ring-1 ring-brand/40' : '')}>
      <span className="block size-[64px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_4px_10px_rgba(0,0,0,0.08)]" style={{ background }} />
      {active && (
        <span className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600">
          {icon === 'sun' ? (
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="8" cy="8" r="2.8" />
              <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1Z" />
            </svg>
          )}
        </span>
      )}
    </span>
  )
}

function SliderRow({
  label,
  description,
  value,
  min,
  max,
  isDefault,
  onChange,
  onReset,
}: {
  label: string
  description: string
  value: number
  min: number
  max: number
  isDefault: boolean
  onChange: (v: number) => void
  onReset: () => void
}) {
  const percent = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-4 bg-gray-50 px-6 py-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-gray-900">{label}</span>
          <button
            aria-label={`${label} 처음 값으로`}
            disabled={isDefault}
            onClick={onReset}
            className="flex size-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:invisible"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7.5A5 5 0 1 1 4.6 11.2" />
              <path d="M3 3.5v4h4" />
            </svg>
          </button>
        </div>
        <p className="text-[13px] text-gray-500">{description}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex h-8 min-w-14 items-center justify-center rounded-lg bg-gray-100 px-2 font-mono text-[13px] text-gray-700">
          {value}%
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={5}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="nubi-range w-full sm:w-[240px]"
          style={{ ['--fill' as string]: `${percent}%` }}
        />
      </div>
    </div>
  )
}
