// 15 신청 현황 · 후기 남기기
// 백엔드에 후기 API가 아직 없어서, 신청 상세로 행사 정보만 보여 주고 저장·제출은 막아 둡니다.
import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { applicationApi } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { Button, ErrorState, LoadingState } from '@/components/ui'
import { qk } from '@/lib/queryKeys'
import { cn } from '@/lib/format'
import { rowDate } from './components/format'
import iconBack from '@/assets/icons/applications-back.svg'
import iconStar from '@/assets/icons/applications-star.svg'
import iconStarEmpty from '@/assets/icons/applications-star-empty.svg'
import iconStarSm from '@/assets/icons/applications-star-sm.svg'
import iconStarSmEmpty from '@/assets/icons/applications-star-sm-empty.svg'
import iconPhotoAdd from '@/assets/icons/applications-photo-add.svg'
import iconSparkle from '@/assets/icons/applications-sparkle.svg'
import iconToggle from '@/assets/icons/applications-toggle.svg'

type Answer = 'YES' | 'NO' | 'UNKNOWN'
const ANSWERS: { value: Answer; label: string }[] = [
  { value: 'YES', label: '그랬어요' },
  { value: 'NO', label: '아니었어요' },
  { value: 'UNKNOWN', label: '몰라요' },
]
const RATING_LABEL = ['', '아쉬웠어요', '조금 아쉬웠어요', '보통이었어요', '좋았어요', '아주 좋았어요']
const REACTIONS = ['즐거워했어요', '다시 가고 싶어해요', '조금 힘들어했어요', '쉬는 시간이 부족했어요', '이동 거리가 길었어요']

export default function ReviewWritePage() {
  const { applicationId } = useParams()
  const id = Number(applicationId)
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.myApplication(id),
    queryFn: () => applicationApi.get(id),
    enabled: Number.isFinite(id),
  })

  const [rating, setRating] = useState(0)
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [diffNote, setDiffNote] = useState('')
  const [reactions, setReactions] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState error={error ?? new Error('신청을 찾을 수 없어요.')} onRetry={refetch} />

  const { program } = data
  const people =
    data.companionCount > 0
      ? `${data.groupName ?? '우리 그룹'} ${data.participantCount}명과 동반 ${data.companionCount}명이`
      : `${data.groupName ?? '우리 그룹'} ${data.participantCount}명이`
  const subtitle = [program.hostName, rowDate(program.startAt).replace(/ \d{2}:\d{2}$/, ''), `${people} 다녀왔어요`]
    .filter(Boolean)
    .join(' · ')
  const answered = data.supports.filter((s) => answers[s.applicationSupportId])
  const hasNo = answered.some((s) => answers[s.applicationSupportId] === 'NO')

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full items-center gap-2.5 pb-4">
        <button aria-label="뒤로" className="size-[22px] shrink-0" onClick={() => navigate('/app/applications')}>
          <img src={iconBack} alt="" className="size-[22px]" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-[13px] font-medium text-gray-500">{subtitle}</p>
          <h1 className="truncate text-[26px] font-bold text-gray-900">{program.title} 후기</h1>
        </div>
        <Button variant="outline" className="text-[13.5px]" disabled>
          임시 저장
        </Button>
        <Button className="text-[13.5px]" disabled>
          후기 올리기
        </Button>
      </div>

      <div className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-[13px] text-gray-700">
        후기 기능 준비 중이에요. 지금은 미리 써 볼 수만 있고, 저장하거나 올릴 수는 없어요.
        {data.status !== 'ATTENDED' && ' 이 신청은 아직 다녀온 상태가 아니에요.'}
      </div>

      <div className="flex w-full items-start gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <Card title="어땠나요?">
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
            {data.supports.length === 0 ? (
              <p className="text-[13px] text-gray-500">이 신청에 담긴 지원 항목이 없어요.</p>
            ) : (
              data.supports.map((s) => {
                const value = answers[s.applicationSupportId]
                return (
                  <div key={s.applicationSupportId} className="flex h-[46px] w-full items-center rounded-xl bg-white pr-2 pl-3.5">
                    <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-gray-900">
                      {s.label}
                      {s.quantity ? ` ${s.quantity}명` : ''}
                    </p>
                    <div className="flex gap-0.5 rounded-[10px] bg-gray-100 p-[3px]">
                      {ANSWERS.map((a) => {
                        const active = value === a.value
                        return (
                          <button
                            key={a.value}
                            onClick={() => setAnswers((prev) => ({ ...prev, [s.applicationSupportId]: a.value }))}
                            className={cn(
                              'h-7 rounded-lg px-3 text-[12.5px] font-medium whitespace-nowrap',
                              active
                                ? a.value === 'NO'
                                  ? 'bg-amber-50 text-amber-500'
                                  : 'bg-white text-gray-900'
                                : 'text-gray-500',
                            )}
                          >
                            {a.label}
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
                    onClick={() => setReactions((prev) => (active ? prev.filter((x) => x !== r) : [...prev, r]))}
                    className={cn(
                      'h-8 rounded-2xl border px-3 text-[13px] font-medium',
                      active ? 'border-brand bg-brand-soft text-brand' : 'border-gray-200 bg-white text-gray-600',
                    )}
                  >
                    {r}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card title="다른 기관에 알려 주고 싶은 점">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="이동, 화장실, 자리, 안내 방식처럼 다음 기관에 도움이 될 점을 적어 주세요"
              className="min-h-24 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[13.5px] leading-[1.6] text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand"
            />
            <div className="flex gap-2">
              <button
                disabled
                title="후기 기능 준비 중"
                className="flex size-[72px] flex-col items-center justify-center gap-0.5 rounded-[10px] border border-dashed border-gray-300 bg-white opacity-60"
              >
                <img src={iconPhotoAdd} alt="" className="size-4" />
                <span className="text-[11.5px] font-medium text-gray-500">사진</span>
              </button>
            </div>
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
                    const a = answers[s.applicationSupportId]
                    return (
                      <span
                        key={s.applicationSupportId}
                        className={cn(
                          'flex h-6 items-center rounded-[7px] px-2 text-xs font-medium',
                          a === 'NO' ? 'bg-amber-50 text-amber-500' : a === 'YES' ? 'bg-brand-soft text-brand' : 'bg-gray-100 text-gray-600',
                        )}
                      >
                        {s.label} {ANSWERS.find((x) => x.value === a)?.label}
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

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col items-start gap-3 rounded-2xl bg-gray-50 px-6 pt-[18px] pb-5">
      <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  )
}
