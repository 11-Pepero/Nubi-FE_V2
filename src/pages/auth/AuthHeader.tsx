import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'

/** 로그인·가입 화면 맨 위 68px 줄 (왼쪽 서비스 이름, 오른쪽 안내 링크). */
export function AuthHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="flex h-[68px] w-full shrink-0 items-center px-10">
      <Link to="/" aria-label="Nubi 홈">
        <Logo size={28} textClassName="text-[19px]" />
      </Link>
      <div className="flex-1" />
      {right}
    </header>
  )
}

export function AuthHeaderLink({ question, label, to }: { question: string; label: string; to: string }) {
  return (
    <div className="flex items-start gap-1.5 text-[14px] whitespace-nowrap">
      <span className="text-gray-500">{question}</span>
      <Link to={to} className="font-bold text-brand hover:underline">
        {label}
      </Link>
    </div>
  )
}
