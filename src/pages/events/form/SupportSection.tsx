import type { SupportTag } from '@/api/types'
import { ErrorState, Spinner } from '@/components/ui'
import { cn } from '@/lib/format'
import { useSupportTags } from './useSupportTags'
import { SectionCard, inputClass } from './fields'

/** 고른 지원 항목: supportTagId → 덧붙일 설명(evidence) */
export type SelectedSupports = Map<number, string>

/** "누구나 올 수 있게" — 주최가 제공하는 지원을 지원 사전에서 고릅니다. */
export function SupportSection({
  value,
  onChange,
  notice,
}: {
  value: SelectedSupports
  onChange: (value: SelectedSupports) => void
  notice?: string
}) {
  const tags = useSupportTags()
  const all: SupportTag[] = tags.data?.flatMap((g) => g.tags) ?? []
  const selected = all.filter((t) => value.has(t.id))

  const toggle = (id: number) => {
    const next = new Map(value)
    if (next.has(id)) next.delete(id)
    else next.set(id, '')
    onChange(next)
  }

  return (
    <SectionCard title="누구나 올 수 있게">
      {notice && <p className="w-full text-[12.5px] text-amber-600">{notice}</p>}
      {tags.isPending ? (
        <Spinner />
      ) : tags.isError ? (
        <ErrorState error={tags.error} onRetry={() => tags.refetch()} className="py-6" />
      ) : (
        <div className="flex w-full flex-wrap gap-1.5">
          {all.map((tag) => {
            const on = value.has(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(tag.id)}
                className={cn(
                  'flex h-8 items-center rounded-2xl border px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
                  on ? 'border-brand bg-brand-soft text-brand' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex w-full flex-col gap-2">
          <p className="text-[12.5px] text-gray-500">어떻게 돕는지 한 줄로 적어 두면 신청하는 기관이 더 쉽게 판단해요. (선택)</p>
          {selected.map((tag) => (
            <div key={tag.id} className="flex w-full items-center gap-3">
              <span className="w-32 shrink-0 truncate text-[13px] font-medium text-gray-700">{tag.label}</span>
              <input
                className={inputClass}
                maxLength={500}
                value={value.get(tag.id) ?? ''}
                placeholder="예: 강당 입구에 경사로가 있어요"
                onChange={(e) => onChange(new Map(value).set(tag.id, e.target.value))}
              />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
