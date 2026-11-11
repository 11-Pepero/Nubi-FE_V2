import { useEffect, useState } from 'react'
import { LogoMark } from './Logo'

const SEEN_KEY = 'nubi.splashSeen'
const DURATION_MS = 2500

function alreadySeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * 메인 화면에 들어올 때 한 번 보여 주는 입장 화면.
 * 로고 틀이 톡 튀어나오고 → 획이 그려지고 → 초록 점이 떨어지며 → "Nubi"가 떠오른 뒤 화면이 열립니다.
 * 같은 탭에서는 한 번만 나오고, 누르면 바로 넘어가며, 움직임 줄이기 설정이면 나오지 않습니다.
 */
export function SplashIntro() {
  const [visible, setVisible] = useState(() => !alreadySeen())

  useEffect(() => {
    if (!visible) return
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* noop */
    }
    const timer = setTimeout(() => setVisible(false), DURATION_MS)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = prevOverflow
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      role="presentation"
      onClick={() => setVisible(false)}
      className="nubi-splash fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center gap-6 overflow-hidden bg-white"
    >
      {/* 은은한 배경 빛 */}
      <div
        aria-hidden
        className="pointer-events-none absolute size-[720px] rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-brand) 22%, transparent) 0%, transparent 65%)' }}
      />
      <div className="relative flex items-center justify-center">
        <span aria-hidden className="nubi-splash-ring absolute size-[120px] rounded-[30px] border-2 border-brand" />
        <LogoMark size={120} animate className="relative drop-shadow-[0_18px_40px_rgba(46,144,250,0.25)]" />
      </div>
      <div className="relative flex flex-col items-center gap-2">
        <span className="nubi-splash-word text-[44px] leading-none font-bold tracking-[-0.03em] text-ink">Nubi</span>
        <span className="nubi-splash-tag text-[15px] font-medium text-gray-500">함께 갈 수 있는 프로그램을 찾아요</span>
      </div>
    </div>
  )
}
