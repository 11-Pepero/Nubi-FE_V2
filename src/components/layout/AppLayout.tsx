import { Outlet } from 'react-router-dom'
import { SelectedGroupProvider } from '@/lib/selectedGroup'
import { Sidebar } from './Sidebar'

/** 로그인 후 화면: 왼쪽 사이드바 + 본문(위 36px, 좌우 40px 여백). */
export function AppLayout() {
  return (
    <SelectedGroupProvider>
      <div className="flex min-h-screen w-full bg-white">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col px-10 pt-9 pb-16">
          <Outlet />
        </main>
      </div>
    </SelectedGroupProvider>
  )
}
