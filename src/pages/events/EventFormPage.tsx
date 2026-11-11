// 06 행사 관리 · 새 행사 올리기 (수정: /app/events/:eventId/edit)
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventApi, programApi, venueApi } from '@/api/endpoints'
import { errorMessage, resolveAssetUrl } from '@/api/client'
import type { EventCreateRequest, ProgramCategory, ProgramDetail, ProgramStatus, Venue } from '@/api/types'
import { Button, ErrorState, LoadingState, PageHeader, useToast } from '@/components/ui'
import { PROGRAM_CATEGORY_LABEL } from '@/lib/labels'
import { cn, fromDateTimeInput, toDateTimeInput } from '@/lib/format'
import { qk } from '@/lib/queryKeys'
import { useSelectedGroup } from '@/lib/selectedGroup'
import { FormField, SectionCard, inputClass, textareaClass } from './form/fields'
import { PhotoPicker, type PhotoItem } from './form/PhotoPicker'
import { VenueSection } from './form/VenueSection'
import { SupportSection, type SelectedSupports } from './form/SupportSection'
import { useSupportTags } from './form/useSupportTags'
import { EventPreviewCard } from './form/EventPreviewCard'
import { PromotionSection } from './promotion/PromotionSection'

export default function EventFormPage() {
  const { eventId: param } = useParams()
  const eventId = param ? Number(param) : null
  const { selectedGroup, isLoading: groupsLoading } = useSelectedGroup()

  // 수정: 상세를 불러와 채웁니다. 그룹을 넘기면 판정 근거(HOST)로 기존 지원 항목 일부를 되살릴 수 있어요.
  const detail = useQuery({
    queryKey: [...qk.program(eventId ?? 0, selectedGroup?.id), 'edit'],
    queryFn: () => programApi.detail(eventId!, selectedGroup?.id),
    enabled: eventId != null && !groupsLoading,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  if (eventId == null) return <EventForm key="new" initial={null} />
  if (Number.isNaN(eventId)) return <ErrorState error={new Error('잘못된 행사 주소예요.')} />
  if (groupsLoading || detail.isPending) return <LoadingState />
  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
  return <EventForm key={`${eventId}-${detail.dataUpdatedAt}`} initial={detail.data} onReload={() => detail.refetch()} />
}

interface FormState {
  title: string
  category: ProgramCategory | ''
  description: string
  date: string
  startTime: string
  endTime: string
  capacity: string
  deadline: string
  contactPhone: string
}

function toFormState(d: ProgramDetail | null): FormState {
  return {
    title: d?.title ?? '',
    category: d?.category ?? '',
    description: d?.description ?? '',
    date: d?.startAt?.slice(0, 10) ?? '',
    startTime: d?.startAt?.slice(11, 16) ?? '',
    endTime: d?.endAt?.slice(11, 16) ?? '',
    capacity: d?.capacity != null ? String(d.capacity) : '',
    deadline: toDateTimeInput(d?.deadlineAt),
    contactPhone: d?.contactPhone ?? '',
  }
}

function initialSupports(d: ProgramDetail | null): SelectedSupports {
  const map: SelectedSupports = new Map()
  d?.eligibility?.reasons.items
    .filter((i) => i.basis === 'HOST' && i.result === 'MET')
    .forEach((i) => map.set(i.supportTagId, i.evidence ?? ''))
  return map
}

function EventForm({ initial, onReload }: { initial: ProgramDetail | null; onReload?: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEdit = initial != null
  const currentStatus: ProgramStatus | null = initial?.status ?? null

  const [form, setForm] = useState<FormState>(() => toFormState(initial))
  const [venue, setVenue] = useState<Venue | null>(initial?.venue ?? null)
  const [supports, setSupports] = useState<SelectedSupports>(() => initialSupports(initial))
  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    (initial?.images ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({ key: `img-${img.imageId}`, kind: 'existing', imageId: img.imageId, url: resolveAssetUrl(img.url) ?? '' })),
  )
  const initialImageIds = useRef((initial?.images ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.imageId))

  // 로컬 미리보기 URL 정리
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(
    () => () => {
      photosRef.current.forEach((p) => {
        if (p.kind === 'new') URL.revokeObjectURL(p.url)
      })
    },
    [],
  )

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const tags = useSupportTags()
  const tagLabel = useMemo(() => {
    const m = new Map<number, string>()
    tags.data?.forEach((g) => g.tags.forEach((t) => m.set(t.id, t.label)))
    return m
  }, [tags.data])

  const facilities = useQuery({
    queryKey: qk.venueFacilities(venue?.venueId ?? 0),
    queryFn: () => venueApi.facilities(venue!.venueId),
    enabled: !!venue,
  })

  // 홍보문·포스터는 저장된 행사 정보로 만들어지므로, 저장 안 한 변경이 있으면 알려 줍니다.
  const [savedForm] = useState(form)
  const [savedSupports] = useState(supports)
  const unsaved =
    (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== savedForm[k]) ||
    (venue?.venueId ?? null) !== (initial?.venue?.venueId ?? null) ||
    supports.size !== savedSupports.size ||
    [...supports].some(([id, ev]) => savedSupports.get(id) !== ev)

  const startAt = form.date && form.startTime ? `${form.date}T${form.startTime}:00` : null

  const buildRequest = (status: 'DRAFT' | 'OPEN'): EventCreateRequest | string => {
    const title = form.title.trim()
    if (!title) return '행사 이름을 적어 주세요.'
    if (title.length > 150) return '행사 이름은 150자까지 적을 수 있어요.'
    if (!form.date || !form.startTime) return '날짜와 시작 시간을 골라 주세요.'
    const start = `${form.date}T${form.startTime}:00`
    const end = form.endTime ? `${form.date}T${form.endTime}:00` : null
    if (end && end < start) return '끝나는 시간이 시작 시간보다 빨라요.'
    const deadline = fromDateTimeInput(form.deadline)
    if (deadline && deadline > start) return '신청 마감은 행사 시작 전이어야 해요.'
    if (status === 'OPEN' && new Date(start).getTime() <= Date.now()) return '이미 지난 시간으로는 공개할 수 없어요.'
    let capacity: number | null = null
    if (form.capacity.trim()) {
      capacity = Number(form.capacity)
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) return '받는 인원은 1~10,000명 사이로 적어 주세요.'
    }
    if (form.description.length > 5000) return '소개는 5,000자까지 적을 수 있어요.'
    if (form.contactPhone.length > 20) return '연락처는 20자까지 적을 수 있어요.'
    return {
      title,
      category: form.category || null,
      description: form.description.trim() || null,
      venueId: venue?.venueId ?? null,
      startAt: start,
      endAt: end,
      deadlineAt: deadline,
      capacity,
      contactPhone: form.contactPhone.trim() || null,
      status,
      conditions: [...supports].map(([supportTagId, evidence]) => ({
        supportTagId,
        status: 'PROVIDED' as const,
        evidence: evidence.trim() || undefined,
      })),
    }
  }

  /** 저장 직후 사진 반영: 뺀 사진 삭제 → 새 사진 업로드 → 순서 맞추기(맨 앞이 대표). */
  const syncPhotos = async (id: number) => {
    const keptIds = new Set(photos.flatMap((p) => (p.kind === 'existing' ? [p.imageId] : [])))
    const removed = initialImageIds.current.filter((imageId) => !keptIds.has(imageId))
    for (const imageId of removed) await eventApi.deleteImage(id, imageId)

    const newItems = photos.filter((p): p is Extract<PhotoItem, { kind: 'new' }> => p.kind === 'new')
    let currentOrder = initialImageIds.current.filter((imageId) => keptIds.has(imageId))
    const newIds = new Map<string, number>()
    if (newItems.length) {
      const list = await eventApi.uploadImages(id, newItems.map((p) => p.file))
      const sorted = list.slice().sort((a, b) => a.sortOrder - b.sortOrder)
      const added = sorted.slice(sorted.length - newItems.length)
      newItems.forEach((p, i) => newIds.set(p.key, added[i].imageId))
      currentOrder = sorted.map((i) => i.imageId)
    }

    const desired = photos.map((p) => (p.kind === 'existing' ? p.imageId : newIds.get(p.key)!))
    if (desired.length > 1 && desired.some((imageId, i) => imageId !== currentOrder[i])) {
      await eventApi.reorderImages(id, desired)
    }
  }

  const save = useMutation({
    mutationFn: async (body: EventCreateRequest) => {
      const saved = isEdit ? await eventApi.update(initial.programId, body) : await eventApi.create(body)
      let photoError: unknown = null
      try {
        await syncPhotos(saved.programId)
      } catch (e) {
        photoError = e
      }
      return { saved, photoError }
    },
    onSuccess: ({ saved, photoError }, body) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      if (photoError) {
        toast.show(`행사는 저장했지만 사진을 반영하지 못했어요. ${errorMessage(photoError)}`, { tone: 'error', duration: 5000 })
        if (isEdit) onReload?.()
        else navigate(`/app/events/${saved.programId}/edit`, { replace: true })
        return
      }
      if (body.status === 'OPEN') {
        toast.show(isEdit ? '행사를 저장했어요.' : '행사를 공개했어요.')
        navigate(`/app/events/${saved.programId}/applications`)
      } else {
        toast.show('임시 저장했어요.')
        navigate('/app/events')
      }
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  const submit = (status: 'DRAFT' | 'OPEN') => {
    const body = buildRequest(status)
    if (typeof body === 'string') {
      toast.show(body, { tone: 'error' })
      return
    }
    save.mutate(body)
  }

  const ended = currentStatus === 'ENDED'
  const canDraft = !isEdit || currentStatus === 'DRAFT'
  const pendingStatus = save.isPending ? save.variables?.status : null

  const title = !isEdit ? '새 행사 올리기' : currentStatus === 'DRAFT' ? '임시 저장한 행사' : '행사 고치기'

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={title}
        actions={
          <div className="flex items-center gap-2">
            {canDraft && (
              <Button
                variant="outline"
                disabled={ended || save.isPending}
                loading={pendingStatus === 'DRAFT'}
                onClick={() => submit('DRAFT')}
              >
                임시 저장
              </Button>
            )}
            <Button disabled={ended || save.isPending} loading={pendingStatus === 'OPEN'} onClick={() => submit('OPEN')}>
              {canDraft ? '공개하기' : '저장하기'}
            </Button>
          </div>
        }
      />

      {ended && (
        <p className="mb-4 rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-gray-500">끝난 행사는 고칠 수 없어요.</p>
      )}
      {currentStatus === 'CLOSED' && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-600">
          신청을 마감한 행사예요. 저장하면 다시 공개되어 신청을 받아요.
        </p>
      )}

      <div className="flex w-full items-start gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <SectionCard title="기본 정보">
            <FormField label="행사 이름">
              <input
                className={inputClass}
                value={form.title}
                maxLength={150}
                placeholder="예: 개관 30주년 함께 걷는 가을 축제"
                onChange={(e) => set('title', e.target.value)}
              />
            </FormField>
            <div className="flex w-full gap-3">
              <FormField label="날짜" className="flex-1">
                <input type="date" className={inputClass} value={form.date} onChange={(e) => set('date', e.target.value)} />
              </FormField>
              <FormField label="시간" className="flex-1">
                <div className={cn(inputClass, 'flex items-center gap-1 focus-within:border-brand')}>
                  <input
                    type="time"
                    aria-label="시작 시간"
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    value={form.startTime}
                    onChange={(e) => set('startTime', e.target.value)}
                  />
                  <span className="text-gray-400">~</span>
                  <input
                    type="time"
                    aria-label="끝나는 시간"
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    value={form.endTime}
                    onChange={(e) => set('endTime', e.target.value)}
                  />
                </div>
              </FormField>
              <FormField label="받는 인원" className="flex-1">
                <div className={cn(inputClass, 'flex items-center gap-1 focus-within:border-brand')}>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    inputMode="numeric"
                    placeholder="제한 없음"
                    className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-gray-400"
                    value={form.capacity}
                    onChange={(e) => set('capacity', e.target.value)}
                  />
                  <span className="text-gray-500">명</span>
                </div>
              </FormField>
            </div>
            <div className="flex w-full gap-3">
              <FormField label="분류" className="flex-1">
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => set('category', e.target.value as ProgramCategory | '')}
                >
                  <option value="">고르지 않음</option>
                  {(Object.keys(PROGRAM_CATEGORY_LABEL) as ProgramCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {PROGRAM_CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="신청 마감" className="flex-1">
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={form.deadline}
                  onChange={(e) => set('deadline', e.target.value)}
                />
              </FormField>
              <FormField label="문의 연락처" className="flex-1">
                <input
                  type="tel"
                  className={inputClass}
                  maxLength={20}
                  placeholder="031-000-0000"
                  value={form.contactPhone}
                  onChange={(e) => set('contactPhone', e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="소개">
              <textarea
                className={textareaClass}
                maxLength={5000}
                placeholder="어떤 행사인지, 무엇을 하는지 적어 주세요."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </FormField>
          </SectionCard>

          <PhotoPicker items={photos} onChange={setPhotos} />

          <VenueSection venue={venue} onChange={setVenue} />

          <SupportSection
            value={supports}
            onChange={setSupports}
            notice={
              isEdit
                ? '저장하면 지금 고른 항목으로 바뀌어요. 예전에 고른 항목이 빠져 있으면 다시 골라 주세요.'
                : undefined
            }
          />

          <SectionCard title="신청 받기">
            <div className="inline-flex items-start gap-0.5 self-start rounded-[10px] bg-gray-200 p-[3px]">
              <span className="flex h-8 items-center rounded-lg bg-white px-3.5 text-[13px] font-medium text-gray-900">
                이 서비스에서 바로 신청
              </span>
              <span
                title="준비 중이에요"
                className="flex h-8 cursor-not-allowed items-center rounded-lg px-3.5 text-[13px] font-medium text-gray-400"
              >
                외부 링크
              </span>
              <span
                title="준비 중이에요"
                className="flex h-8 cursor-not-allowed items-center rounded-lg px-3.5 text-[13px] font-medium text-gray-400"
              >
                전화로만
              </span>
            </div>
            <p className="w-full text-[12.5px] text-gray-500">
              다른 기관이 지원 카드로 신청하면 인원과 필요한 지원이 함께 들어와요.
            </p>
          </SectionCard>

          {isEdit ? (
            <PromotionSection eventId={initial.programId} dirty={unsaved} />
          ) : (
            <SectionCard title="AI 홍보문">
              <p className="w-full text-[12.5px] text-gray-500">
                행사를 한 번 저장하면 일반·쉬운 말·문자용 홍보문과 포스터 PDF를 만들 수 있어요.
              </p>
            </SectionCard>
          )}
        </div>

        <div className="sticky top-6 flex w-[380px] shrink-0 flex-col gap-4">
          <EventPreviewCard
            title={form.title.trim()}
            startAt={startAt}
            capacity={form.capacity ? Number(form.capacity) || null : null}
            venue={venue}
            facilities={facilities.data?.facilities ?? []}
            supportLabels={[...supports.keys()].map((id) => tagLabel.get(id)).filter((l): l is string => !!l)}
            thumbnailUrl={photos[0]?.url ?? null}
          />
        </div>
      </div>
    </div>
  )
}
