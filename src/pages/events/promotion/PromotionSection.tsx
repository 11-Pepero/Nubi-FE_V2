// 06 행사 올리기 · AI 홍보문 탭 (일반 / 쉬운 말 / 문자용). 저장된 행사에서만 쓸 수 있어요.
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { eventApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { Promotion } from '@/api/types'
import { Button, SegmentedTabs, useToast } from '@/components/ui'
import { cn } from '@/lib/format'
import { SectionCard, textareaClass } from '../form/fields'

type Kind = 'general' | 'easy' | 'sms'

const TABS: { value: Kind; label: string }[] = [
  { value: 'general', label: '일반' },
  { value: 'easy', label: '쉬운 말' },
  { value: 'sms', label: '문자용' },
]

const KIND_HINT: Record<Kind, string> = {
  general: '누리집이나 게시판에 올리기 좋은 글이에요.',
  easy: '발달장애인도 읽기 쉽게 쓴 글이에요. 한 줄 35자, 15줄 안으로 맞춰 주세요. 포스터에 이 글이 들어가요.',
  sms: '문자나 포스터에 넣기 좋은 짧은 문구예요.',
}

const EASY_LINE_MAX = 35
const EASY_LINES_MAX = 15
const POSTER_EASY_MAX = 1000

function easyStats(text: string) {
  const lines = text.replace(/\n+$/, '').split('\n')
  const lineCount = text.trim() ? lines.length : 0
  const longLines = lines.filter((l) => [...l].length > EASY_LINE_MAX).length
  return { lineCount, longLines, chars: [...text].length }
}

export function PromotionSection({ eventId, dirty }: { eventId: number; dirty: boolean }) {
  const toast = useToast()
  const [tab, setTab] = useState<Kind>('general')
  const [result, setResult] = useState<Promotion | null>(null)
  const [texts, setTexts] = useState<Record<Kind, string>>({ general: '', easy: '', sms: '' })

  const write = useMutation({
    mutationFn: () => eventApi.writePromotion(eventId),
    onSuccess: (data) => {
      setResult(data)
      setTexts({ general: data.general ?? '', easy: data.easy ?? '', sms: data.sms ?? '' })
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  const easyEdited = result != null && texts.easy !== (result.easy ?? '')

  const poster = useMutation({
    // 화면에서 쉬운 말을 고쳤을 때만 보내고, 아니면 서버 초안을 씁니다.
    mutationFn: () => eventApi.downloadPoster(eventId, easyEdited ? texts.easy.trim() || undefined : undefined),
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  const confirmRewrite = () => {
    if (result && (['general', 'easy', 'sms'] as Kind[]).some((k) => texts[k] !== (result[k] ?? ''))) {
      return window.confirm('다시 쓰면 고친 글이 사라져요. 다시 쓸까요?')
    }
    return true
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(texts[tab])
      toast.show('복사했어요.')
    } catch {
      toast.show('복사하지 못했어요. 글을 직접 골라 복사해 주세요.', { tone: 'error' })
    }
  }

  const downloadPoster = () => {
    if (easyEdited && [...texts.easy].length > POSTER_EASY_MAX) {
      toast.show(`포스터에 넣을 쉬운 말은 ${POSTER_EASY_MAX.toLocaleString()}자까지예요.`, { tone: 'error' })
      return
    }
    poster.mutate()
  }

  const stats = easyStats(texts.easy)
  const easyOver = stats.lineCount > EASY_LINES_MAX || stats.longLines > 0

  return (
    <SectionCard
      title="AI 홍보문"
      aside={
        result && !result.aiWritten ? (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11.5px] font-medium text-amber-600">AI 없이 쓴 초안</span>
        ) : result ? (
          <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11.5px] font-medium text-brand">AI가 썼어요</span>
        ) : null
      }
    >
      <p className="w-full text-[12.5px] text-gray-500">
        저장한 행사 정보로 홍보문을 써요. 글은 저장되지 않으니 필요한 글은 복사해 두세요.
        {dirty && <span className="text-amber-600"> 고친 내용이 있으면 먼저 저장해 주세요.</span>}
      </p>

      {!result ? (
        <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8">
          {write.isPending ? (
            <p className="flex items-center gap-2 text-[13.5px] text-gray-700">
              <span className="size-3.5 animate-spin rounded-full border-2 border-brand border-r-transparent" />
              AI가 홍보문을 쓰고 있어요…
            </p>
          ) : (
            <>
              <p className="text-[13.5px] text-gray-700">일반, 쉬운 말, 문자용 홍보문을 한 번에 써 드려요.</p>
              <Button onClick={() => write.mutate()}>홍보문 쓰기</Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex w-full items-center justify-between gap-2">
            <SegmentedTabs items={TABS} value={tab} onChange={setTab} />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!texts[tab].trim()} onClick={copy}>
                복사하기
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={write.isPending}
                onClick={() => {
                  if (confirmRewrite()) write.mutate()
                }}
              >
                다시 쓰기
              </Button>
            </div>
          </div>

          <p className="w-full text-[12.5px] text-gray-500">{KIND_HINT[tab]}</p>

          <div className="relative w-full">
            <textarea
              aria-label={`${TABS.find((t) => t.value === tab)?.label} 홍보문`}
              className={cn(textareaClass, tab === 'sms' ? 'min-h-28' : 'min-h-64', write.isPending && 'opacity-50')}
              value={texts[tab]}
              disabled={write.isPending}
              onChange={(e) => setTexts((t) => ({ ...t, [tab]: e.target.value }))}
            />
            {write.isPending && (
              <p className="absolute inset-0 flex items-center justify-center gap-2 text-[13.5px] text-gray-700">
                <span className="size-3.5 animate-spin rounded-full border-2 border-brand border-r-transparent" />
                AI가 홍보문을 쓰고 있어요…
              </p>
            )}
          </div>

          {tab === 'easy' ? (
            <div className="flex w-full items-center justify-between gap-3">
              <p className={cn('text-[12.5px]', easyOver ? 'text-amber-600' : 'text-gray-500')}>
                {stats.lineCount}/{EASY_LINES_MAX}줄
                {stats.longLines > 0 ? ` · ${EASY_LINE_MAX}자 넘는 줄 ${stats.longLines}개` : ` · 모든 줄이 ${EASY_LINE_MAX}자 안이에요`}
                {easyEdited && ` · ${stats.chars.toLocaleString()}/${POSTER_EASY_MAX.toLocaleString()}자`}
              </p>
              <Button variant="dark" size="sm" loading={poster.isPending} onClick={downloadPoster}>
                포스터 PDF로 받기
              </Button>
            </div>
          ) : (
            <p className="w-full text-right text-[12.5px] text-gray-400">{[...texts[tab]].length.toLocaleString()}자</p>
          )}
        </>
      )}
    </SectionCard>
  )
}
