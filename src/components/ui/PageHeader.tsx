import type { ReactNode } from 'react'

/** 본문 맨 위 제목 줄 (26px 굵은 제목 + 오른쪽 버튼). */
export function PageHeader({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-2 pb-4">
      <h1 className="min-w-0 flex-1 text-[26px] font-bold text-gray-900">{title}</h1>
      {children}
      {actions}
    </div>
  )
}
