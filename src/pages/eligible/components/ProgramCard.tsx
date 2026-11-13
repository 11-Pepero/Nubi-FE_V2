import { Link } from 'react-router-dom'
import { resolveAssetUrl } from '@/api/client'
import type { EligibilityResult, ProgramSummary } from '@/api/types'
import { Button } from '@/components/ui'
import { PROGRAM_CATEGORY_LABEL } from '@/lib/labels'
import { cn } from '@/lib/format'
import calendarIcon from '@/assets/icons/eligible-calendar.svg'
import pinIcon from '@/assets/icons/eligible-pin.svg'
import userIcon from '@/assets/icons/eligible-user.svg'
import { ResultBadge, Tag } from './Tag'
import { cardDateTime, deadlineLabel, isDeadlineSoon } from './programFormat'

export interface ResultCounts {
  metCount: number
  missingCount: number
  unknownCount: number
  careCheckCount: number
}

/** 확인할 점 한 줄 (노란 메모). 목록 응답의 숫자로 만듭니다. */
function checkNotes(counts: ResultCounts): string[] {
  const notes: string[] = []
  if (counts.missingCount > 0) notes.push(`지원 ${counts.missingCount}개 없음`)
  if (counts.unknownCount > 0) notes.push(`지원 ${counts.unknownCount}개 확인 필요`)
  if (counts.careCheckCount > 0) notes.push(`개별 케어 ${counts.careCheckCount}건 확인`)
  return notes
}

/** 참여 가능 프로그램 카드 (화면 03 그리드, 04 카드 보기). */
const FOOT_LINK =
  'inline-flex h-9 shrink-0 items-center rounded-[18px] px-2.5 text-[13px] font-medium whitespace-nowrap text-gray-500 hover:bg-gray-100 hover:text-gray-900'
// 카드 폭이 좁아도 넘치지 않게 신청 버튼 폭을 고정해 카드끼리 줄을 맞춰요.
const FOOT_BUTTON = 'w-[104px] shrink-0 px-0'

export function ProgramCard({
  program,
  result,
  counts,
  selected,
  detailTo,
  onApply,
}: {
  program: ProgramSummary
  result?: EligibilityResult | null
  counts?: ResultCounts | null
  selected?: boolean
  detailTo: string
  onApply: () => void
}) {
  const notes = counts ? checkNotes(counts) : []
  const open = program.status === 'OPEN'
  const soon = isDeadlineSoon(program.deadlineAt)

  return (
    <article
      className={cn(
        'flex h-full flex-col gap-3 rounded-2xl border-2 bg-gray-50 px-5 py-[18px]',
        selected ? 'border-brand' : 'border-transparent',
      )}
    >
      <div className="flex items-center gap-1.5">
        <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-gray-500">{program.hostName ?? '용인시 공개 공고'}</p>
        <p className={cn('shrink-0 text-[14px] font-bold whitespace-nowrap', !open ? 'text-gray-400' : soon ? 'text-brand' : 'text-gray-900')}>
          {open ? deadlineLabel(program.deadlineAt) : '마감'}
        </p>
      </div>

      {/* 제목·일시·장소·정원·태그 왼쪽, 사진은 오른쪽에 그 높이만큼 꽉 차게 보여요.
          제목은 두 줄까지, 한 줄이어도 두 줄 높이를 잡아 카드 높이를 맞춥니다. */}
      <div className="flex gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Link
            to={detailTo}
            title={program.title}
            className="line-clamp-2 min-h-[2lh] text-[16px] leading-[1.4] font-bold text-gray-900 hover:underline"
          >
            {program.title}
          </Link>

          <ul className="flex flex-col gap-1 text-[12.5px] text-gray-600">
            <li className="flex items-center gap-1.5">
              <img src={calendarIcon} alt="" width={14} height={14} />
              {cardDateTime(program.startAt)}
            </li>
            <li className="flex items-center gap-1.5">
              <img src={pinIcon} alt="" width={14} height={14} />
              <span className="truncate">{program.venue?.name ?? '장소 미정'}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <img src={userIcon} alt="" width={14} height={14} />
              {program.capacity ? `정원 ${program.capacity}명` : '정원 제한 없음'}
            </li>
          </ul>

          <div className="flex min-h-7 flex-wrap gap-1.5">
            {program.category && <Tag>{PROGRAM_CATEGORY_LABEL[program.category]}</Tag>}
            {counts && counts.metCount > 0 && <Tag>지원 {counts.metCount}개 맞음</Tag>}
            {program.applyMethod === 'DIRECT' && <Tag>앱에서 바로 신청</Tag>}
          </div>
        </div>
        {program.thumbnailUrl && (
          <Link to={detailTo} tabIndex={-1} aria-hidden className="relative w-[120px] shrink-0 self-stretch overflow-hidden rounded-xl bg-white">
            <img src={resolveAssetUrl(program.thumbnailUrl)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          </Link>
        )}
      </div>

      {notes.length > 0 && (
        <div className="flex gap-1.5 rounded-[10px] bg-amber-50 px-3 py-2.5 text-[12.5px]">
          <span className="shrink-0 font-bold text-gray-900">확인할 점</span>
          <span className="text-gray-700">{notes.join(' · ')}</span>
        </div>
      )}

      {/* 배지·자세히 보기·신청 버튼은 모두 36px 알약 모양, 신청 버튼은 폭을 고정해 카드끼리 줄이 맞아요. */}
      <div className="mt-auto flex min-w-0 items-center gap-1 pt-0.5">
        {result && <ResultBadge result={result} size="pill" />}
        <span className="flex-1" />
        <Link to={detailTo} className={FOOT_LINK}>
          자세히 보기
        </Link>
        {!open ? (
          <Button variant="outline" disabled className={FOOT_BUTTON}>
            신청 마감
          </Button>
        ) : program.applyMethod === 'DIRECT' ? (
          <Button variant="tonal" onClick={onApply} className={FOOT_BUTTON}>
            바로 신청
          </Button>
        ) : (
          <Button variant="outline" onClick={onApply} className={FOOT_BUTTON}>
            {program.applyMethod ? '신청 준비' : '원문에서 신청'}
          </Button>
        )}
      </div>
    </article>
  )
}
