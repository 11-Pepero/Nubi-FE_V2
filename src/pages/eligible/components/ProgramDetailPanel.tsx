import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { programApi } from '@/api/endpoints'
import { resolveAssetUrl } from '@/api/client'
import type { Eligibility, EligibilityItem, ProgramDetail } from '@/api/types'
import { ErrorState, LoadingState } from '@/components/ui'
import {
  applyMethodLabel,
  FACILITY_STATUS_LABEL,
  FACILITY_TYPE_LABEL,
  ITEM_RESULT_LABEL,
  JUDGEMENT_BASIS_LABEL,
} from '@/lib/labels'
import { qk } from '@/lib/queryKeys'
import { cn, formatRange, supportText } from '@/lib/format'
import closeIcon from '@/assets/icons/eligible-close.svg'
import imageIcon from '@/assets/icons/eligible-image.svg'
import imageSmIcon from '@/assets/icons/eligible-image-sm.svg'
import prevIcon from '@/assets/icons/eligible-prev.svg'
import nextIcon from '@/assets/icons/eligible-next.svg'
import calendarIcon from '@/assets/icons/eligible-calendar-15.svg'
import pinIcon from '@/assets/icons/eligible-pin-15.svg'
import userIcon from '@/assets/icons/eligible-user-15.svg'
import docIcon from '@/assets/icons/eligible-doc-15.svg'
import checkIcon from '@/assets/icons/eligible-check.svg'
import alertIcon from '@/assets/icons/eligible-alert.svg'
import { ResultBadge, Tag } from './Tag'
import { deadlineLabel, isDeadlineSoon, monthDay } from './programFormat'
import { useProgramApply } from './useProgramApply'

const FOOT_BTN =
  'inline-flex h-11 items-center justify-center rounded-[22px] px-4 text-[13.5px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed'
const FOOT_OUTLINE = 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:text-gray-400'
const FOOT_PRIMARY = 'bg-brand text-white hover:bg-brand-strong disabled:bg-gray-200 disabled:text-gray-400'

/** 09 프로그램 자세히 보기: 오른쪽에서 열리는 480px 패널. */
export function ProgramDetailPanel({
  programId,
  careIds,
  onClose,
}: {
  programId: number
  careIds?: number[]
  onClose: () => void
}) {
  const { apply, modal, group } = useProgramApply(careIds)
  const groupId = group?.id

  const detailQuery = useQuery({
    queryKey: qk.program(programId, groupId),
    queryFn: () => programApi.detail(programId, groupId),
    enabled: Number.isFinite(programId),
  })
  // 개별 케어를 직접 고른 경우에는 그 케어로 다시 판정합니다.
  const eligibilityQuery = useQuery({
    queryKey: qk.eligibility(programId, groupId ?? 0, careIds),
    queryFn: () => programApi.eligibility(programId, groupId!, careIds),
    enabled: !!groupId && !!careIds?.length,
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const program = detailQuery.data
  const eligibility = careIds?.length ? (eligibilityQuery.data ?? null) : (program?.eligibility ?? null)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="프로그램 자세히 보기"
        className="fixed top-0 right-0 z-40 flex h-screen w-[480px] max-w-full flex-col border-l border-gray-200 bg-white"
      >
        <div className="flex items-center gap-2 pt-5 pr-5 pb-3 pl-6">
          <p className="min-w-0 truncate text-[13px] font-medium text-gray-500">{program?.hostName ?? ''}</p>
          <span className="flex-1" />
          {program && (
            <p
              className={cn(
                'text-[15px] font-bold whitespace-nowrap',
                program.status !== 'OPEN' ? 'text-gray-400' : isDeadlineSoon(program.deadlineAt) ? 'text-brand' : 'text-gray-900',
              )}
            >
              {program.status === 'OPEN' ? deadlineLabel(program.deadlineAt) : '마감'}
            </p>
          )}
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-md p-0.5 hover:bg-gray-100">
            <img src={closeIcon} alt="" width={20} height={20} />
          </button>
        </div>

        {detailQuery.isLoading ? (
          <LoadingState className="flex-1" />
        ) : detailQuery.isError || !program ? (
          <ErrorState className="flex-1" error={detailQuery.error} onRetry={() => detailQuery.refetch()} />
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-5">
              <Gallery program={program} />
              <Summary program={program} />
              {group && (
                <EligibilityBox
                  title={`${group.name} ${group.memberCount}명 기준`}
                  eligibility={eligibility}
                  loading={!!careIds?.length && eligibilityQuery.isLoading}
                  error={eligibilityQuery.isError ? eligibilityQuery.error : null}
                />
              )}
              <Facilities program={program} />
              {program.description && (
                <section className="flex flex-col gap-2">
                  <h3 className="text-[14px] font-bold text-gray-900">소개</h3>
                  <p className="text-[13.5px] leading-[1.65] whitespace-pre-line text-gray-700">{program.description}</p>
                </section>
              )}
            </div>

            <div className="flex gap-2 border-t border-gray-200 px-6 pt-3.5 pb-5">
              {program.contactPhone ? (
                <a href={`sms:${program.contactPhone}`} className={cn(FOOT_BTN, FOOT_OUTLINE)}>
                  문의 문자 쓰기
                </a>
              ) : (
                <button type="button" disabled title="주최 기관 연락처가 없어요" className={cn(FOOT_BTN, FOOT_OUTLINE)}>
                  문의 문자 쓰기
                </button>
              )}
              <button
                type="button"
                className={cn(FOOT_BTN, 'flex-1', program.applyMethod === 'DIRECT' ? FOOT_PRIMARY : FOOT_OUTLINE)}
                disabled={program.status !== 'OPEN'}
                onClick={() => apply(program)}
              >
                {program.status !== 'OPEN'
                  ? '신청이 마감됐어요'
                  : program.applyMethod === 'DIRECT'
                    ? group
                      ? `${group.name}로 바로 신청`
                      : '바로 신청'
                    : program.applyMethod
                      ? '신청 준비'
                      : '원문에서 신청'}
              </button>
            </div>
          </>
        )}
      </aside>
      {modal}
    </>
  )
}

function Gallery({ program }: { program: ProgramDetail }) {
  const images = useMemo(() => [...program.images].sort((a, b) => a.sortOrder - b.sortOrder), [program.images])
  const [index, setIndex] = useState(0)
  const current = images[index]
  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length)

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex h-[250px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-gray-200">
        {current ? (
          <img src={resolveAssetUrl(current.url)} alt={`${program.title} 사진 ${index + 1}`} className="size-full object-cover" />
        ) : (
          <img src={imageIcon} alt="" width={36} height={36} />
        )}
        {images.length > 0 && (
          <span className="absolute top-3 right-3 flex h-[22px] items-center rounded-[10px] bg-gray-900/60 px-2 text-[11.5px] font-medium text-white">
            {index + 1} / {images.length}
          </span>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="이전 사진"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-2xl bg-white/90"
            >
              <img src={prevIcon} alt="" width={16} height={16} />
            </button>
            <button
              type="button"
              aria-label="다음 사진"
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-2xl bg-white/90"
            >
              <img src={nextIcon} alt="" width={16} height={16} />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.imageId}
              type="button"
              aria-label={`사진 ${i + 1} 보기`}
              onClick={() => setIndex(i)}
              className={cn(
                'flex h-14 w-[78px] shrink-0 items-center justify-center overflow-hidden rounded-lg',
                i === index ? 'border-2 border-brand bg-gray-200' : 'bg-gray-100',
              )}
            >
              {img.url ? (
                <img src={resolveAssetUrl(img.url)} alt="" className="size-full object-cover" />
              ) : (
                <img src={imageSmIcon} alt="" width={18} height={18} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Summary({ program }: { program: ProgramDetail }) {
  const place = [program.venue?.name, program.venue?.address].filter(Boolean).join(' · ')
  // 수집 공고(주최 기관이 없는 공고)는 applyUrl이 원문 페이지예요.
  const sourceUrl = program.hostOrganizationId == null ? program.applyUrl : null
  const method = program.applyMethod === 'DIRECT' ? '이 서비스에서 바로 신청' : applyMethodLabel(program.applyMethod)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <h2 className="min-w-0 flex-1 text-[22px] font-bold text-gray-900">{program.title}</h2>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 flex h-8 shrink-0 items-center gap-1 rounded-2xl border border-gray-200 bg-white px-3.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
          >
            원문 보기
            <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4.5 2.5h5v5M9.5 2.5 3 9" />
            </svg>
          </a>
        )}
      </div>
      {program.hostName && <p className="text-[13px] text-gray-500">주최 {program.hostName}</p>}
      <ul className="flex flex-col gap-1.5 text-[13.5px] text-gray-700">
        <li className="flex items-center gap-2">
          <img src={calendarIcon} alt="" width={15} height={15} />
          {formatRange(program.startAt, program.endAt)}
        </li>
        <li className="flex items-center gap-2">
          <img src={pinIcon} alt="" width={15} height={15} />
          {place || '장소 미정'}
        </li>
        <li className="flex items-center gap-2">
          <img src={userIcon} alt="" width={15} height={15} />
          {program.capacity ? `정원 ${program.capacity}명` : '정원 제한 없음'}
        </li>
        <li className="flex items-center gap-2">
          <img src={docIcon} alt="" width={15} height={15} />
          {method}
          {program.deadlineAt ? ` · ${monthDay(program.deadlineAt)} 마감` : ''}
          {program.applyMethod === 'ONLINE' && program.applyUrl && (
            <a href={program.applyUrl} target="_blank" rel="noreferrer" className="font-medium text-brand">
              접수 페이지
            </a>
          )}
        </li>
      </ul>
    </div>
  )
}

function itemDetail(item: { result: EligibilityItem['result']; basis: EligibilityItem['basis']; evidence: string | null }) {
  if (item.evidence) return item.evidence
  const basis = item.basis ? ` · ${JUDGEMENT_BASIS_LABEL[item.basis]}` : ''
  return `${ITEM_RESULT_LABEL[item.result]}${basis}`
}

function EligibilityBox({
  title,
  eligibility,
  loading,
  error,
}: {
  title: string
  eligibility: Eligibility | null
  loading: boolean
  error: unknown
}) {
  return (
    <section className="flex flex-col gap-2.5 rounded-[14px] bg-gray-50 px-4 py-3.5">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 text-[14px] font-bold text-gray-900">{title}</h3>
        {eligibility && <ResultBadge result={eligibility.result} tall={false} />}
      </div>
      {loading ? (
        <p className="text-[13px] text-gray-500">판정하는 중이에요</p>
      ) : error ? (
        <p className="text-[13px] text-red-500">판정을 불러오지 못했어요.</p>
      ) : !eligibility ? (
        <p className="text-[13px] text-gray-500">이 그룹 기준 판정 정보가 없어요.</p>
      ) : (
        <>
          {eligibility.reasons.capacityExceeded && (
            <Row ok={false} label="정원" detail="그룹 인원이 정원보다 많아요" />
          )}
          {eligibility.reasons.items.map((item) => (
            <Row key={`i-${item.supportTagId}`} ok={item.result === 'MET'} label={supportText(item)} detail={itemDetail(item)} />
          ))}
          {eligibility.reasons.careChecks.map((c, i) => (
            <Row
              key={`c-${c.careId}-${c.supportTagId ?? i}`}
              ok={c.result === 'MET'}
              label={`${c.alias} · ${c.label ?? c.content ?? '개별 케어'}`}
              detail={itemDetail(c)}
            />
          ))}
          {eligibility.reasons.items.length === 0 && eligibility.reasons.careChecks.length === 0 && !eligibility.reasons.capacityExceeded && (
            <p className="text-[13px] text-gray-500">그룹에 적은 지원이 없어 따로 확인할 점이 없어요.</p>
          )}
        </>
      )}
    </section>
  )
}

function Row({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <img src={ok ? checkIcon : alertIcon} alt={ok ? '충족' : '확인 필요'} width={15} height={15} className="mt-0.5 shrink-0" />
      <p className="w-[150px] shrink-0 font-medium text-gray-900">{label}</p>
      <p className="min-w-0 flex-1 text-gray-500">{detail}</p>
    </div>
  )
}

function Facilities({ program }: { program: ProgramDetail }) {
  const available = program.facilities.filter((f) => f.status === 'YES')
  const others = program.facilities.filter((f) => f.status !== 'YES')
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-[14px] font-bold text-gray-900">편의시설</h3>
      {program.facilities.length === 0 ? (
        <p className="text-[12.5px] text-gray-400">이 장소의 편의시설 정보가 아직 없어요.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {available.map((f) => (
              <Tag key={f.facilityType} tone="soft">
                {FACILITY_TYPE_LABEL[f.facilityType]}
              </Tag>
            ))}
            {others.map((f) => (
              <Tag key={f.facilityType} tone={f.status === 'NO' ? 'red' : 'amber'}>
                {FACILITY_TYPE_LABEL[f.facilityType]} {FACILITY_STATUS_LABEL[f.status]}
              </Tag>
            ))}
          </div>
          <p className="text-[12.5px] text-gray-400">장애인편의시설 공공데이터와 기관이 적은 정보를 합쳤어요.</p>
        </>
      )}
    </section>
  )
}
