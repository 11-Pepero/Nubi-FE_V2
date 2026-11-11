import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { notificationApi, organizationApi } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { qk } from '@/lib/queryKeys'
import { useSelectedGroup } from '@/lib/selectedGroup'
import { cn } from '@/lib/format'
import { NotificationPanel } from './NotificationPanel'
import { Logo } from '@/components/brand/Logo'
import iconSidebar from '@/assets/icons/sidebar-toggle.svg'
import iconBell from '@/assets/icons/bell.svg'
import iconPlus from '@/assets/icons/plus.svg'
import iconHome from '@/assets/icons/nav-home.svg'
import iconSearch from '@/assets/icons/nav-search.svg'
import iconUsers from '@/assets/icons/nav-users.svg'
import iconClipboard from '@/assets/icons/nav-clipboard.svg'
import iconMegaphone from '@/assets/icons/nav-megaphone.svg'
import iconMap from '@/assets/icons/nav-map.svg'
import iconSettings from '@/assets/icons/settings.svg'

const NAV = [
  { to: '/app/eligible', label: '참여 가능 프로그램', icon: iconHome },
  { to: '/app/programs', label: '프로그램 탐색', icon: iconSearch },
  { to: '/app/support', label: '지원 관리', icon: iconUsers },
  { to: '/app/applications', label: '신청 현황', icon: iconClipboard },
  { to: '/app/events', label: '행사 관리', icon: iconMegaphone },
  { to: '/app/map', label: '사각지대 지도', icon: iconMap },
]

/** Figma "Sidebar" (288px). 참여 그룹·기관 이름·안 읽은 알림 수는 API에서 받아옵니다. */
export function Sidebar() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { groups, selectGroup } = useSelectedGroup()
  const { data: me } = useQuery({ queryKey: qk.me, queryFn: organizationApi.me })
  const { data: unread } = useQuery({
    queryKey: qk.unreadCount,
    queryFn: notificationApi.unreadCount,
    refetchInterval: 60_000,
  })
  const [collapsed, setCollapsed] = useState(false)
  const [notiOpen, setNotiOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const unreadCount = unread?.unreadCount ?? 0

  if (collapsed) {
    return (
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-2 border-r border-gray-200 bg-gray-50 py-3">
        <button aria-label="사이드바 펼치기" className="flex size-9 items-center justify-center rounded-[10px] hover:bg-gray-200" onClick={() => setCollapsed(false)}>
          <img src={iconSidebar} alt="" className="size-5" />
        </button>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) => cn('flex size-9 items-center justify-center rounded-xl', isActive ? 'bg-gray-200' : 'hover:bg-gray-100')}
          >
            <img src={item.icon} alt={item.label} className="size-[17px]" />
          </NavLink>
        ))}
      </aside>
    )
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[288px] shrink-0 flex-col border-r border-gray-200 bg-gray-50 py-3">
      <div className="relative flex min-h-9 items-center gap-3 px-3">
        <button aria-label="사이드바 접기" className="size-5 shrink-0" onClick={() => setCollapsed(true)}>
          <img src={iconSidebar} alt="" className="size-5" />
        </button>
        <Link to="/app/eligible" aria-label="Nubi 홈">
          <Logo size={26} textClassName="text-[18px]" />
        </Link>
        <div className="flex-1" />
        <button
          aria-label={`알림 ${unreadCount}개`}
          className={cn('relative size-8 shrink-0 rounded-[10px] hover:bg-gray-200', notiOpen && 'bg-gray-200')}
          onClick={() => setNotiOpen((v) => !v)}
        >
          <img src={iconBell} alt="" className="absolute top-1.5 left-1.5 size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 left-[18px] flex h-4 min-w-4 items-center justify-center rounded-lg border-2 border-gray-50 bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <NotificationPanel open={notiOpen} onClose={() => setNotiOpen(false)} />
      </div>

      <div className="h-4" />
      <div className="px-3">
        <Link
          to="/app/prepare"
          className="flex h-10 w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 hover:bg-gray-50"
        >
          <img src={iconPlus} alt="" className="size-4" />
          <span className="text-[13px] font-bold text-gray-900">프로그램 신청 준비</span>
        </Link>
      </div>
      <div className="h-2.5" />

      <nav className="flex flex-col gap-0.5 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium',
                isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100',
              )
            }
          >
            <img src={item.icon} alt="" className="size-[17px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-2.5 px-6 pt-[22px]">
        <p className="text-xs font-medium text-gray-400">참여 그룹</p>
        {groups.length === 0 && (
          <Link to="/app/support" className="text-xs text-brand">
            + 그룹 만들기
          </Link>
        )}
        {groups.map((g) => (
          <button
            key={g.id}
            className="flex items-center gap-1.5 text-left"
            onClick={() => {
              selectGroup(g.id)
              navigate('/app/eligible')
            }}
          >
            <span className="text-[13px] font-medium text-gray-700 hover:text-gray-900">{g.name}</span>
            <span className="text-xs text-gray-400">{g.memberCount}명</span>
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <div className="relative flex items-center gap-2.5 pr-4 pl-6">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-brand text-[13px] font-bold text-white">
          {me?.name?.[0] ?? '·'}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-[13px] font-medium text-gray-900">{me?.name ?? ''}</p>
          <p className="truncate text-xs text-gray-400">담당자 {me?.member.name ?? me?.member.email ?? ''}</p>
        </div>
        <button aria-label="설정" className="size-[18px] shrink-0" onClick={() => setMenuOpen((v) => !v)}>
          <img src={iconSettings} alt="" className="size-[18px]" />
        </button>
        {menuOpen && (
          <div className="absolute right-4 bottom-10 z-30 w-44 overflow-hidden rounded-xl border border-gray-200 glass-surface py-1 shadow-lg">
            <button
              className="w-full px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setMenuOpen(false)
                navigate('/app/settings/appearance')
              }}
            >
              화면 설정
            </button>
            <button
              className="w-full px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-gray-50"
              onClick={async () => {
                setMenuOpen(false)
                await logout()
                navigate('/login')
              }}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
