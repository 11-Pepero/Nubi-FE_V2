import { Link } from 'react-router-dom'
import { resolveAssetUrl } from '@/api/client'
import type { EligibilityResult, ProgramSummary } from '@/api/types'
import { Button } from '@/components/ui'
import { applyMethodLabel, DISTRICT_LABEL, PROGRAM_CATEGORY_LABEL, PROGRAM_STATUS_LABEL } from '@/lib/labels'
import { cn } from '@/lib/format'
import buildingIcon from '@/assets/icons/programs-building.svg'
import externalIcon from '@/assets/icons/programs-external.svg'
import { ResultBadge, Tag } from '@/pages/eligible/components/Tag'
import { cardDate, deadlineLabel, isDeadlineSoon } from '@/pages/eligible/components/programFormat'
import { openOriginal } from '@/pages/eligible/components/useProgramApply'

/** 프로그램 탐색 목록 한 줄 (화면 04, 64px). */
export function ProgramRow({
  program,
  result,
  detailTo,
  onApply,
}: {
  program: ProgramSummary
  /** 고른 그룹 기준 판정. 모르면 null */
  result: EligibilityResult | null
  detailTo: string
  onApply: () => void
}) {
  const open = program.status === 'OPEN'
  const meta = [program.hostName, program.venue?.district ? DISTRICT_LABEL[program.venue.district] : program.venue?.name, cardDate(program.startAt)]
    .filter(Boolean)
    .join('  ·  ')

  return (
    <div className="flex min-h-16 w-full items-center gap-3.5 rounded-[14px] bg-gray-50 px-4 py-2">
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white">
        {program.thumbnailUrl ? (
          <img src={resolveAssetUrl(program.thumbnailUrl)} alt="" className="size-full object-cover" />
        ) : (
          <img src={buildingIcon} alt="" width={18} height={18} />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link to={detailTo} className="truncate text-[14.5px] font-bold text-gray-900 hover:underline">
          {program.title}
        </Link>
        <p className="truncate text-[12.5px] whitespace-pre text-gray-500">{meta}</p>
      </div>

      <div className="hidden w-[220px] shrink-0 gap-1.5 overflow-hidden lg:flex">
        {program.category && <Tag>{PROGRAM_CATEGORY_LABEL[program.category]}</Tag>}
        {/* 수집 공고는 신청 방법이 비어 있어요 */}
        <Tag>{applyMethodLabel(program.applyMethod)}</Tag>
      </div>

      <div className="flex w-[84px] shrink-0">
        {!open ? (
          <Tag tone="gray">{PROGRAM_STATUS_LABEL[program.status]}</Tag>
        ) : result ? (
          <ResultBadge result={result} tall={false} />
        ) : (
          <Tag tone="gray">정보 없음</Tag>
        )}
      </div>

      <p
        className={cn(
          'w-[52px] shrink-0 text-right text-[13.5px] font-bold',
          !open ? 'text-gray-400' : isDeadlineSoon(program.deadlineAt) ? 'text-brand' : 'text-gray-900',
        )}
      >
        {open ? deadlineLabel(program.deadlineAt) : '마감'}
      </p>

      {/* 수집 공고(신청 방법 모름)는 원문 공고를, 그 밖에는 상세를 엽니다. */}
      {!program.applyMethod ? (
        <button
          type="button"
          onClick={() => void openOriginal(program.programId)}
          title="원문 공고 보기"
          aria-label={`${program.title} 원문 공고 새 창으로 보기`}
          className="shrink-0 rounded p-0.5 hover:bg-gray-200"
        >
          <img src={externalIcon} alt="" width={16} height={16} />
        </button>
      ) : (
        <Link to={detailTo} aria-label={`${program.title} 자세히 보기`} className="shrink-0 rounded p-0.5 hover:bg-gray-200">
          <img src={externalIcon} alt="" width={16} height={16} />
        </Link>
      )}

      <div className="flex w-24 shrink-0 justify-end">
        {!open ? (
          <Link to={detailTo}>
            <Button variant="outline" size="sm">
              자세히
            </Button>
          </Link>
        ) : program.applyMethod === 'DIRECT' ? (
          <Button size="sm" onClick={onApply}>
            바로 신청
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onApply}>
            {program.applyMethod ? '신청 준비' : '원문에서 신청'}
          </Button>
        )}
      </div>
    </div>
  )
}

