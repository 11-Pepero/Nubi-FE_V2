import { useId } from 'react'
import { cn } from '@/lib/format'

/**
 * Nubi 로고. 49px PNG를 벡터로 다시 그린 것이라 어떤 크기에서도 깨지지 않습니다.
 * framed=false면 흰 둥근 사각형 없이 글자 모양만 그립니다.
 */
export function LogoMark({
  size = 28,
  framed = true,
  className,
  animate = false,
}: {
  size?: number
  framed?: boolean
  className?: string
  /** 입장 화면용: 획을 그리듯 나타나고 점이 톡 떨어집니다. */
  animate?: boolean
}) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Nubi"
      className={cn('shrink-0', animate && 'nubi-logo-animate', className)}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5C7CFA" />
          <stop offset="1" stopColor="#3B5BDB" />
        </linearGradient>
      </defs>
      {framed && <rect className="nubi-logo-frame" x="2" y="2" width="96" height="96" rx="24" fill="#fff" stroke="#E6E9F0" strokeWidth="2" />}
      <path
        className="nubi-logo-stroke"
        pathLength={1}
        d="M29.5 67V32.5L46.5 57.5C49.5 62 55 63.2 60 60.6C65 58 68.8 52.4 70.5 46.5V67"
        fill="none"
        stroke={`url(#${id}-stroke)`}
        strokeWidth="10.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="nubi-logo-dot" cx="70.5" cy="30.5" r="5.6" fill="#22B573" />
    </svg>
  )
}

/** 로고 + "Nubi" 글자. */
export function Logo({ size = 28, textClassName, className }: { size?: number; textClassName?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} />
      <span className={cn('font-bold tracking-[-0.01em] text-ink', textClassName)}>Nubi</span>
    </span>
  )
}
