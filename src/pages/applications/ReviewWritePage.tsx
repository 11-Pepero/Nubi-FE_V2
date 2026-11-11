// 15 신청 현황 · 후기 남기기
// 후기는 신청 하나에 하나예요. 이미 남긴 후기(?reviewId=)는 내용을 불러올 API가 없어 빈 양식에서 새로 고쳐 써요.
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applicationApi, reviewApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { CheckAnswer, MyApplicationDetail, ReviewReaction, ReviewRequest } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Button, ErrorState, LoadingState, useToast } from '@/components/ui'
import { CHECK_ANSWER_LABEL, REVIEW_REACTION_LABEL } from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { cn } from '@/lib/format'
import { rowDate } from './components/format'
import { canReview } from './components/review/reviewable'
import { clearReviewDraft, loadReviewDraft, saveReviewDraft } from './components/review/reviewDraft'
import iconBack from '@/assets/icons/applications-back.svg'
import iconStar from '@/assets/icons/applications-star.svg'
import iconStarEmpty from '@/assets/icons/applications-star-empty.svg'
import iconStarSm from '@/assets/icons/applications-star-sm.svg'
import iconStarSmEmpty from '@/assets/icons/applications-star-sm-empty.svg'
import iconPhotoAdd from '@/assets/icons/applications-photo-add.svg'
import iconSparkle from '@/assets/icons/applications-sparkle.svg'
import iconToggle from '@/assets/icons/applications-toggle.svg'

const ANSWERS: CheckAnswer[] = ['YES', 'NO', 'UNKNOWN']
const RATING_LABEL = ['', '아쉬웠어요', '조금 아쉬웠어요', '보통이었어요', '좋았어요', '아주 좋았어요']
const REACTIONS = Object.keys(REVIEW_REACTION_LABEL) as ReviewReaction[]
const MISMATCH_MAX = 500
const CONTENT_MAX = 2000
const PHOTO_MAX = 10
const PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ReviewWritePage() {
  const { applicationId } = useParams()
  const id = Number(applicationId)
  const [searchParams] = useSearchParams()
  const paramReviewId = Number(searchParams.get('reviewId')) || null
  const navigate = useNavigate()
  const [now] = useState(() => Date.now())

  const detail = useQuery({
    queryKey: qk.myApplication(id),
    queryFn: () => applicationApi.get(id),
    enabled: Number.isFinite(id),
  })
  // 상세 응답에는 reviewId가 없어요. 주소에 없으면 목록에서 찾아요.
  const listParams = { status: ['CONFIRMED' as const, 'ATTENDED' as const], size: 100 }
  const list = useQuery({
    queryKey: qk.myApplications(listParams),
    queryFn: () => applicationApi.list(listParams),
    enabled: Number.isFinite(id) && paramReviewId == null,
  })
  const reviewId = paramReviewId ?? list.data?.content.find((a) => a.applicationId === id)?.reviewId ?? null

  if (detail.isLoading || list.isLoading) return <LoadingState />
  if (detail.error || !detail.data)
    return <ErrorState error={detail.error ?? new Error('신청을 찾을 수 없어요.')} onRetry={detail.refetch} />

  const data = detail.data
  if (!canReview(data.status, data.program.startAt, now)) {
    return (
      <div className="flex w-full flex-col">
        <Header data={data} onBack={() => navigate('/app/applications')} />
        <div className="flex flex-col gap-1.5 rounded-2xl bg-gray-50 px-6 py-5">
          <p className="text-[15px] font-bold text-gray-900">아직 후기를 남길 수 없어요</p>
          <p className="text-[13.5px] leading-[1.6] text-gray-600">{notReviewableReason(data)}</p>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/app/applications')}>
              신청 현황으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <ReviewForm key={`${id}-${reviewId ?? 'new'}`} data={data} reviewId={reviewId} />
}

function notReviewableReason(data: MyApplicationDetail): string {
  if (data.status === 'CONFIRMED' || data.status === 'ATTENDED')
    return `행사가 시작된 뒤(${rowDate(data.program.startAt)}부터) 후기를 남길 수 있어요.`
  if (data.status === 'REJECTED' || data.status === 'CANCELLED')
    return '참여하지 않은 신청이라 후기를 남길 수 없어요.'
  return '후기는 참여가 확정되고 행사가 시작된 뒤에 남길 수 있어요. 아직 참여 확정 전이에요.'
}

function subtitleOf(data: MyApplicationDetail) {
  const people =
    data.companionCount > 0
      ? `${data.groupName ?? '우리 그룹'} ${data.participantCount}명과 동반 ${data.companionCount}명이`
      : `${data.groupName ?? '우리 그룹'} ${data.participantCount}명이`
  return [data.program.hostName, rowDate(data.program.startAt).replace(/ \d{2}:\d{2}$/, ''), `${people} 다녀왔어요`]
    .filter(Boolean)
    .join(' · ')
}

function Header({ data, onBack, children }: { data: MyApplicationDetail; onBack: () => void; children?: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-2.5 pb-4">
      <button aria-label="뒤로" className="size-[22px] shrink-0" onClick={onBack}>
        <img src={iconBack} alt="" className="size-[22px]" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[13px] font-medium text-gray-500">{subtitleOf(data)}</p>
        <h1 className="truncate text-[26px] font-bold text-gray-900">{data.program.title} 후기</h1>
      </div>
      {children}
    </div>
  )
}

interface Photo {
  file: File
  url: string
}

function ReviewForm({ data, reviewId }: { data: MyApplicationDetail; reviewId: number | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { auth } = useAuth()
  const id = data.applicationId

  const [draft] = useState(() => loadReviewDraft(id))
  const [rating, setRating] = useState(draft?.rating ?? 0)
  const [answers, setAnswers] = useState<Record<number, CheckAnswer>>(draft?.answers ?? {})
  const [diffNote, setDiffNote] = useState(draft?.mismatchNote ?? '')
  const [reactions, setReactions] = useState<ReviewReaction[]>(draft?.reactions ?? [])
  const [note, setNote] = useState(draft?.content ?? '')
  const [isPublic, setIsPublic] = useState(draft?.isPublic ?? true)
  const [photos, setPhotos] = useState<Photo[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  // 미리보기 주소는 화면을 떠날 때 정리해요.
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  // 같은 지원 태그가 여러 번 담겼으면 한 번만 물어요. 답은 supportTagId 기준이에요.
  const supports = data.supports.filter((s, i, arr) => arr.findIndex((x) => x.supportTagId === s.supportTagId) === i)
  const answered = supports.filter((s) => answers[s.supportTagId])
  const hasNo = answered.some((s) => answers[s.supportTagId] === 'NO')

  const pickPhotos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    const ok: Photo[] = []
    for (const file of files) {
      if (!PHOTO_TYPES.includes(file.type)) {
        toast.show(`${file.name}: JPG, PNG, WEBP 사진만 올릴 수 있어요`, { tone: 'error' })
      } else if (file.size > PHOTO_BYTES) {
        toast.show(`${file.name}: 사진 한 장은 5MB까지 올릴 수 있어요`, { tone: 'error' })
      } else {
        ok.push({ file, url: URL.createObjectURL(file) })
      }
    }
    const room = PHOTO_MAX - photos.length
    if (ok.length > room) {
      toast.show(`사진은 ${PHOTO_MAX}장까지 올릴 수 있어요`, { tone: 'error' })
      ok.slice(room).forEach((p) => URL.revokeObjectURL(p.url))
    }
    setPhotos((prev) => [...prev, ...ok.slice(0, Math.max(room, 0))])
  }

  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url)
    setPhotos((prev) => prev.filter((p) => p.url !== url))
  }

  const saveDraft = () => {
    const saved = saveReviewDraft(id, { rating, answers, mismatchNote: diffNote, reactions, content: note, isPublic })
    toast.show(saved ? '이 브라우저에 임시 저장했어요. 사진은 저장되지 않아요.' : '임시 저장하지 못했어요', {
      tone: saved ? 'default' : 'error',
    })
  }

  const submit = useMutation({
    mutationFn: async () => {
      const body: ReviewRequest = {
        rating,
        checks: answered.map((s) => ({ supportTagId: s.supportTagId, answer: answers[s.supportTagId] })),
        mismatchNote: hasNo && diffNote.trim() ? diffNote.trim() : undefined,
        reactions,
        content: note.trim() || undefined,
        isPublic,
      }
      const review = reviewId ? await reviewApi.update(reviewId, body) : await applicationApi.writeReview(id, body)
      let photoError: unknown = null
      if (photos.length > 0) {
        try {
          await reviewApi.uploadImages(review.reviewId, photos.map((p) => p.file))
        } catch (e) {
          photoError = e
        }
      }
      return { photoError }
    },
    onSuccess: ({ photoError }) => {
      clearReviewDraft(id)
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['programs', 'reviews'] })
      if (photoError) {
        toast.show(`후기는 올렸지만 사진을 올리지 못했어요. ${errorMessage(photoError)}`, { tone: 'error', duration: 6000 })
      } else {
        toast.show(reviewId ? '후기를 고쳤어요' : '후기를 올렸어요')
      }
      navigate('/app/applications')
    },
    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
  })

  return (
    <div className="flex w-full flex-col">
      <Header data={data} onBack={() => navigate('/app/applications')}>
        <Button variant="outline" className="text-[13.5px]" onClick={saveDraft} disabled={submit.isPending}>
          임시 저장
        </Button>
        <Button
          className="text-[13.5px]"
          disabled={rating === 0}
          title={rating === 0 ? '별점을 먼저 골라 주세요' : undefined}
          loading={submit.isPending}
          onClick={() => submit.mutate()}
        >
          {reviewId ? '후기 고치기' : '후기 올리기'}
        </Button>
      </Header>

      {reviewId && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-[13px] text-gray-700">
          이미 남긴 후기를 새로 고쳐 써요. 예전 내용은 불러올 수 없어서 처음부터 다시 적어 주셔야 해요. 올리면 예전 후기를 이 내용으로 바꾸고,
          예전에 올린 사진은 그대로 남아요.
        </div>
      )}

      <div className="flex w-full items-start gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <Card title="어땠나요?" required>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} aria-label={`별 ${n}개`} className="size-[30px]" onClick={() => setRating(n)}>
                  <img src={n <= rating ? iconStar : iconStarEmpty} alt="" className="size-[30px]" />
                </button>
              ))}
              {rating > 0 && <span className="text-[14px] font-bold text-gray-700">{RATING_LABEL[rating]}</span>}
            </div>
          </Card>

          <Card title="공고에 적힌 대로였나요?">
            <p className="text-[12.5px] text-gray-500">여기 남긴 답은 다음 기관의 참여 판정에 쓰여요.</p>
            {supports.length === 0 ? (
              <p className="text-[13px] text-gray-500">이 신청에 담긴 지원 항목이 없어요.</p>
            ) : (
              supports.map((s) => {
                const value = answers[s.supportTagId]
                return (
                  <div key={s.supportTagId} className="flex h-[46px] w-full items-center rounded-xl bg-white pr-2 pl-3.5">
                    <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-gray-900">
                      {s.label}
                      {s.quantity ? ` ${s.quantity}명` : ''}
                    </p>
                    <div className="flex gap-0.5 rounded-[10px] bg-gray-100 p-[3px]">
                      {ANSWERS.map((a) => {
                        const active = value === a
                        return (
                          <button
                            key={a}
                            aria-pressed={active}
                            onClick={() => setAnswers((prev) => ({ ...prev, [s.supportTagId]: a }))}
                            className={cn(
                              'h-7 rounded-lg px-3 text-[12.5px] font-medium whitespace-nowrap',
                              active
                                ? a === 'NO'
                                  ? 'bg-amber-50 text-amber-500'
                                  : 'bg-white text-gray-900'
                                : 'text-gray-500',
                            )}
                          >
                            {CHECK_ANSWER_LABEL[a]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
            {hasNo && (
              <div className="flex w-full items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5">
                <span className="shrink-0 text-[13px] text-gray-700">어떤 점이 달랐나요?</span>
                <input
                  value={diffNote}
                  maxLength={MISMATCH_MAX}
                  aria-label="어떤 점이 달랐나요?"
                  onChange={(e) => setDiffNote(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-700 outline-none"
                />
              </div>
            )}
          </Card>

          <Card title="이용자분들 반응">
            <div className="flex w-full flex-wrap gap-1.5">
              {REACTIONS.map((r) => {
                const active = reactions.includes(r)
                return (
                  <button
                    key={r}
                    aria-pressed={active}
                    onClick={() => setReactions((prev) => (active ? prev.filter((x) => x !== r) : [...prev, r]))}
                    className={cn(
                      'h-8 rounded-2xl border px-3 text-[13px] font-medium',
                      active ? 'border-brand bg-brand-soft text-brand' : 'border-gray-200 bg-white text-gray-600',
                    )}
                  >
                    {REVIEW_REACTION_LABEL[r]}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card title="다른 기관에 알려 주고 싶은 점">
            <textarea
              value={note}
              maxLength={CONTENT_MAX}
              onChange={(e) => setNote(e.target.value)}
              placeholder="이동, 화장실, 자리, 안내 방식처럼 다음 기관에 도움이 될 점을 적어 주세요"
              className="min-h-24 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[13.5px] leading-[1.6] text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand"
            />
            <div className="flex w-full flex-wrap gap-2">
              {photos.map((p) => (
                <div key={p.url} className="relative size-[72px] overflow-hidden rounded-[10px] bg-gray-100">
                  <img src={p.url} alt={p.file.name} className="size-full object-cover" />
                  <button
                    aria-label={`${p.file.name} 빼기`}
                    onClick={() => removePhoto(p.url)}
                    className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-gray-900/70 text-[12px] leading-none text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < PHOTO_MAX && (
                <button
                  onClick={() => fileInput.current?.click()}
                  className="flex size-[72px] flex-col items-center justify-center gap-0.5 rounded-[10px] border border-dashed border-gray-300 bg-white"
                >
                  <img src={iconPhotoAdd} alt="" className="size-4" />
                  <span className="text-[11.5px] font-medium text-gray-500">
                    사진{photos.length > 0 ? ` ${photos.length}/${PHOTO_MAX}` : ''}
                  </span>
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept={PHOTO_TYPES.join(',')}
                multiple
                hidden
                onChange={pickPhotos}
              />
            </div>
            <p className="text-xs text-gray-500">
              {note.length}/{CONTENT_MAX}자 · 사진은 JPG, PNG, WEBP로 한 장에 5MB, 모두 {PHOTO_MAX}장까지 올릴 수 있어요
            </p>
          </Card>
        </div>

        <div className="flex w-[360px] shrink-0 flex-col gap-4">
          <div className="flex flex-col gap-2.5 rounded-2xl bg-gray-50 px-5 py-[18px]">
            <p className="text-[12.5px] font-medium text-gray-500">다른 기관에게 이렇게 보여요</p>
            <div className="flex flex-col gap-2 rounded-xl bg-white px-4 py-3.5">
              <div className="flex items-center gap-1.5">
                <p className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-gray-900">{auth?.organizationName ?? ''}</p>
                {[1, 2, 3, 4, 5].map((n) => (
                  <img key={n} src={n <= rating ? iconStarSm : iconStarSmEmpty} alt="" className="size-[13px]" />
                ))}
              </div>
              <p className="text-xs text-gray-500">
                이용자 {data.participantCount}명{data.companionCount > 0 ? `, 동반 ${data.companionCount}명이` : '이'} 함께 다녀왔어요
              </p>
              <p className={cn('text-[13px] leading-[1.6] whitespace-pre-line', note ? 'text-gray-700' : 'text-gray-400')}>
                {note || '여기에 남긴 글이 보여요.'}
              </p>
              {answered.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {answered.map((s) => {
                    const a = answers[s.supportTagId]
                    return (
                      <span
                        key={s.supportTagId}
                        className={cn(
                          'flex h-6 items-center rounded-[7px] px-2 text-xs font-medium',
                          a === 'NO' ? 'bg-amber-50 text-amber-500' : a === 'YES' ? 'bg-brand-soft text-brand' : 'bg-gray-100 text-gray-600',
                        )}
                      >
                        {s.label} {CHECK_ANSWER_LABEL[a]}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-brand-soft px-5 py-4">
            <div className="flex items-center gap-1.5">
              <img src={iconSparkle} alt="" className="size-[15px]" />
              <p className="text-[13.5px] font-bold text-brand">후기가 반영되는 곳</p>
            </div>
            <p className="text-[13px] leading-[1.6] text-gray-700">
              "그랬어요"로 답한 항목은 확인됨으로, "아니었어요"로 답한 항목은 확인 필요로 표시되고 주최 기관에 알려 드려요.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-5 py-3.5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 whitespace-nowrap">
              <p className="text-[13.5px] font-medium text-gray-900">다른 기관에도 공개</p>
              <p className="text-[12.5px] text-gray-500">끄면 주최 기관만 봐요</p>
            </div>
            <button
              role="switch"
              aria-checked={isPublic}
              aria-label="다른 기관에도 공개"
              onClick={() => setIsPublic((v) => !v)}
              className="h-6 w-10 shrink-0"
            >
              {isPublic ? (
                <img src={iconToggle} alt="" className="h-6 w-10" />
              ) : (
                <span className="flex h-6 w-10 items-center rounded-xl bg-gray-300 px-[3px]">
                  <span className="size-[18px] rounded-full bg-white" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({ title, required, children }: { title: string; required?: boolean; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col items-start gap-3 rounded-2xl bg-gray-50 px-6 pt-[18px] pb-5">
      <h2 className="text-[15px] font-bold text-gray-900">
        {title}
        {required && <span className="ml-1 text-[12.5px] font-medium text-gray-400">(꼭 골라 주세요)</span>}
      </h2>
      {children}
    </section>
  )
}
