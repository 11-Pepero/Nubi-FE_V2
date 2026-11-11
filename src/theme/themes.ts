// 화면 설정: 색상 테마, 모드, 명암, 불투명도
export type ColorMode = 'system' | 'light' | 'dark'
export type ResolvedMode = 'light' | 'dark'

export interface AccentSet {
  /** 버튼, 링크, 강조 숫자 */
  brand: string
  /** 눌렀을 때(hover) */
  strong: string
  /** 연한 배경 (안내 상자, 고른 칩). 비우면 강조색을 바탕에 섞어 만듭니다. */
  soft: string
}

export interface ThemeDef {
  id: string
  name: string
  light: AccentSet
  dark: AccentSet
  /** 바탕·사이드바·카드·테두리·글자에 스며드는 색과 세기(0~20, 클수록 진하게 물듦) */
  tint: { light: string; dark: string; lightStrength: number; darkStrength: number }
  /** 테마 카드의 동그라미 (밝은 / 어두운) */
  swatch: { light: string; dark: string }
}

export const THEMES: ThemeDef[] = [
  {
    id: 'nubi',
    name: 'Nubi',
    light: { brand: '#2e90fa', strong: '#1570ef', soft: '#eff8ff' },
    dark: { brand: '#2f7fe0', strong: '#4b93ec', soft: '' },
    tint: { light: '#2e90fa', dark: '#3b82f6', lightStrength: 4, darkStrength: 5 },
    swatch: {
      light: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #cfe6ff 45%, #2e90fa 100%)',
      dark: 'radial-gradient(circle at 70% 30%, #53a7ff 0%, #1d3557 50%, #0d1117 100%)',
    },
  },
  {
    id: 'iris',
    name: 'Iris',
    light: { brand: '#6e56cf', strong: '#5b43bd', soft: '#f3f0ff' },
    dark: { brand: '#7258e6', strong: '#8a74ee', soft: '' },
    tint: { light: '#7c5cf0', dark: '#7c5cf0', lightStrength: 12, darkStrength: 10 },
    swatch: {
      light: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #ddd5ff 45%, #8b6ef0 100%)',
      dark: 'radial-gradient(circle at 70% 30%, #9d8cf2 0%, #3a2d6b 50%, #13111c 100%)',
    },
  },
  {
    id: 'grove',
    name: 'Grove',
    light: { brand: '#12a150', strong: '#0b8a42', soft: '#ebfaf1' },
    dark: { brand: '#1a8a4c', strong: '#25a05b', soft: '' },
    tint: { light: '#2f9e62', dark: '#2f9e62', lightStrength: 12, darkStrength: 9 },
    swatch: {
      light: 'radial-gradient(circle at 30% 30%, #f6f1e4 0%, #bfe6c9 45%, #2f9e62 100%)',
      dark: 'radial-gradient(circle at 70% 30%, #6bdc9b 0%, #2c5a3b 50%, #121a14 100%)',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    light: { brand: '#0e8fa8', strong: '#0a7389', soft: '#e8f8fb' },
    dark: { brand: '#0e7f99', strong: '#1696b3', soft: '' },
    tint: { light: '#1386b8', dark: '#138fb0', lightStrength: 12, darkStrength: 10 },
    swatch: {
      light: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #c4e6ee 45%, #3b8fd0 100%)',
      dark: 'radial-gradient(circle at 70% 30%, #6dbbe8 0%, #1f4f5c 50%, #0b1416 100%)',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    light: { brand: '#e2632b', strong: '#c44f1c', soft: '#fff3ec' },
    dark: { brand: '#cc5a24', strong: '#e06d34', soft: '' },
    tint: { light: '#d9773a', dark: '#c8703c', lightStrength: 16, darkStrength: 10 },
    swatch: {
      light: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #f4cdb8 45%, #c96a37 100%)',
      dark: 'radial-gradient(circle at 70% 30%, #e59a5f 0%, #5a3424 50%, #17100c 100%)',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    light: { brand: '#d6407a', strong: '#b92e64', soft: '#fdf0f5' },
    dark: { brand: '#c93a72', strong: '#dc4f86', soft: '' },
    tint: { light: '#d6407a', dark: '#c93a72', lightStrength: 11, darkStrength: 9 },
    swatch: {
      light: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #f6c6da 45%, #d6407a 100%)',
      dark: 'radial-gradient(circle at 70% 30%, #c2306a 0%, #4f1530 50%, #160a10 100%)',
    },
  },
]

export interface Appearance {
  mode: ColorMode
  themeId: string
  /** 명암 50~150, 기본 100 */
  contrast: number
  /** 메뉴·대화 상자 불투명도 40~100, 기본 100 */
  glass: number
}

export const DEFAULT_APPEARANCE: Appearance = { mode: 'system', themeId: 'nubi', contrast: 100, glass: 100 }
export const CONTRAST_RANGE = { min: 50, max: 150 }
export const GLASS_RANGE = { min: 40, max: 100 }

export const STORAGE_KEY = 'nubi.appearance'

export function resolveMode(mode: ColorMode): ResolvedMode {
  if (mode !== 'system') return mode
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** 화면에 적용할 CSS 변수. index.html의 첫 화면 스크립트도 저장된 이 값을 그대로 씁니다. */
export function cssVarsFor(appearance: Appearance, resolved: ResolvedMode): Record<string, string> {
  const theme = THEMES.find((t) => t.id === appearance.themeId) ?? THEMES[0]
  const accent = theme[resolved]
  // 다크 모드의 연한 강조 배경은 강조색을 바탕에 섞어 만듭니다(바탕 색이 테마마다 달라서).
  const soft = accent.soft || `color-mix(in oklab, ${accent.brand} 20%, var(--surface))`
  const c = appearance.contrast
  // 100보다 크면 회색을 글자 쪽(진하게), 작으면 배경 쪽(흐리게)으로 섞습니다.
  const amount = Math.min(60, Math.abs(c - 100) * 0.6)
  return {
    '--tint': theme.tint[resolved],
    '--tint-strength': String(resolved === 'dark' ? theme.tint.darkStrength : theme.tint.lightStrength),
    '--accent': accent.brand,
    '--accent-strong': accent.strong,
    '--accent-soft': soft,
    '--contrast-target': c >= 100 ? 'var(--contrast-fg)' : 'var(--contrast-bg)',
    '--contrast-amount': `${amount}%`,
    '--glass-opacity': `${appearance.glass}%`,
  }
}

// ── 미리보기용: CSS와 같은 방식으로 섞은 색을 JS로 계산합니다(sRGB 근사). ──
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

export function mixHex(base: string, tint: string, percent: number): string {
  const a = hexToRgb(base)
  const b = hexToRgb(tint)
  const t = Math.max(0, Math.min(100, percent)) / 100
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

const NEUTRAL = {
  light: { surface: '#ffffff', side: '#f3f4f6', line: '#e5e7eb', bar: '#d1d5db' },
  dark: { surface: '#121316', side: '#1a1c20', line: '#2e3238', bar: '#3d424a' },
}

/** 모드 미리보기 카드에 쓰는, 테마가 스며든 바탕색들 */
export function previewPalette(theme: ThemeDef, mode: ResolvedMode) {
  const n = NEUTRAL[mode]
  const tint = theme.tint[mode]
  const k = mode === 'dark' ? theme.tint.darkStrength : theme.tint.lightStrength
  return {
    bg: mixHex(n.surface, tint, k * 0.45),
    side: mixHex(n.side, tint, k * 1),
    line: mixHex(n.line, tint, k * 1),
    bar: mixHex(n.bar, tint, k * 0.9),
    card: mixHex(n.surface, tint, k * 0.45),
    cardBorder: mixHex(n.line, tint, k * 1),
  }
}
