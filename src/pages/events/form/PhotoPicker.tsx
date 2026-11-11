import { useRef, useState } from 'react'
import { useToast } from '@/components/ui'
import { cn } from '@/lib/format'
import { SectionCard } from './fields'
import iconPlus from '@/assets/icons/events-plus.svg'
import iconClose from '@/assets/icons/events-close.svg'

/** 저장된 사진(existing) 또는 저장 직후 올릴 로컬 사진(new). 맨 앞이 대표. */
export type PhotoItem =
  | { key: string; kind: 'existing'; imageId: number; url: string }
  | { key: string; kind: 'new'; file: File; url: string }

export const MAX_PHOTOS = 10
const MAX_BYTES = 5 * 1024 * 1024 // 백엔드 multipart max-file-size
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

let seq = 0

export function PhotoPicker({ items, onChange }: { items: PhotoItem[]; onChange: (items: PhotoItem[]) => void }) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragKey, setDragKey] = useState<string | null>(null)

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_PHOTOS - items.length
    const picked: PhotoItem[] = []
    const rejected: string[] = []
    for (const file of Array.from(files)) {
      if (!ACCEPT.includes(file.type)) rejected.push(`${file.name}: JPG, PNG, WEBP만 올릴 수 있어요`)
      else if (file.size > MAX_BYTES) rejected.push(`${file.name}: 5MB보다 커요`)
      else if (picked.length >= room) rejected.push(`사진은 ${MAX_PHOTOS}장까지 올릴 수 있어요`)
      else picked.push({ key: `new-${++seq}`, kind: 'new', file, url: URL.createObjectURL(file) })
    }
    if (rejected.length) toast.show([...new Set(rejected)][0], { tone: 'error' })
    if (picked.length) onChange([...items, ...picked])
  }

  const remove = (key: string) => {
    const target = items.find((i) => i.key === key)
    if (target?.kind === 'new') URL.revokeObjectURL(target.url)
    onChange(items.filter((i) => i.key !== key))
  }

  const moveTo = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return
    const from = items.findIndex((i) => i.key === fromKey)
    const to = items.findIndex((i) => i.key === toKey)
    if (from < 0 || to < 0) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <SectionCard
      title="사진"
      aside={
        <>
          <span className="text-[12.5px] font-medium text-gray-400">
            {items.length} / {MAX_PHOTOS}
          </span>
          <span className="flex-1" />
          <span className="text-[12.5px] whitespace-nowrap text-gray-500">끌어서 순서를 바꿔요. 첫 사진이 대표예요.</span>
        </>
      }
    >
      <div className="flex w-full flex-wrap gap-2">
        {items.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-[88px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 bg-white hover:bg-gray-50"
          >
            <img src={iconPlus} alt="" width={20} height={20} />
            <span className="text-xs font-medium text-gray-500">사진 추가</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(',')}
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />

        {items.map((item, index) => (
          <div
            key={item.key}
            draggable
            onDragStart={(e) => {
              setDragKey(item.key)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (dragKey) moveTo(dragKey, item.key)
            }}
            onDragEnd={() => setDragKey(null)}
            onDrop={(e) => e.preventDefault()}
            className={cn(
              'relative size-[88px] shrink-0 cursor-grab overflow-hidden rounded-xl bg-gray-100',
              dragKey === item.key && 'opacity-50',
            )}
          >
            <img src={item.url} alt="" className="size-full object-cover" draggable={false} />
            <button
              type="button"
              aria-label="사진 빼기"
              onClick={() => remove(item.key)}
              className="absolute top-1.5 right-1.5 flex size-[22px] items-center justify-center rounded-[11px] bg-[rgba(17,24,39,0.6)] hover:bg-[rgba(17,24,39,0.8)]"
            >
              <img src={iconClose} alt="" width={12} height={12} />
            </button>
            {index === 0 && (
              <span className="absolute bottom-1.5 left-1.5 flex h-5 items-center rounded-md bg-brand px-1.5 text-[11px] font-bold text-white">
                대표
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="w-full text-[12.5px] text-gray-400">
        JPG, PNG, WEBP · 한 장에 5MB까지 · 얼굴이 보이는 사진은 동의를 받은 것만 올려 주세요.
      </p>
    </SectionCard>
  )
}
