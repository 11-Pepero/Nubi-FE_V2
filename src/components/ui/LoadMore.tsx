import { useEffect, useRef } from 'react'
import { cn } from '@/lib/format'

interface InfiniteLike {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError?: boolean
  fetchNextPage: () => unknown
}

/**
 * 목록 끝에 두면 화면에 가까워질 때 다음 쪽을 자동으로 불러옵니다 (무한 스크롤).
 * 다음 쪽이 없으면 아무것도 그리지 않고, 불러오다 실패하면 다시 불러오기 버튼을 보여 줍니다.
 */
export function LoadMore({ query, className }: { query: InfiniteLike; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query

  useEffect(() => {
    const el = ref.current
    if (!el || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) fetchNextPage()
      },
      // 끝에 닿기 조금 전에 미리 불러와 스크롤이 끊기지 않게 합니다.
      { rootMargin: '0px 0px 400px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  if (!hasNextPage) return null

  return (
    <div ref={ref} className={cn('flex min-h-10 items-center justify-center pt-4', className)} aria-live="polite">
      {isFetchNextPageError ? (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          className="h-9 rounded-[18px] border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
        >
          불러오지 못했어요. 다시 불러오기
        </button>
      ) : isFetchingNextPage ? (
        <span className="flex items-center gap-2 text-[13px] text-gray-500">
          <span className="size-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand" aria-hidden />
          더 불러오는 중이에요
        </span>
      ) : null}
    </div>
  )
}
