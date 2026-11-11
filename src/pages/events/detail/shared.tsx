// 행사 상세(화면 12·13·14·16)에서 함께 쓰는 작은 컴포넌트.
import type { ApplicationStatus, PrepStatus } from '@/api/types'
import { HOST_APPLICATION_STATUS_LABEL, PREP_STATUS_LABEL } from '@/lib/labels'
import { cn } from '@/lib/format'
import { PREP_ORDER, type StatItem } from './utils'
import iconCheck from '@/assets/icons/event-detail-check.svg'

// ---------- 위쪽 숫자 카드 ----------
export function StatCards({ items }: { items: StatItem[] }) {
  return (
    <div className="flex w-full gap-3 pt-5">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-[14px] bg-gray-50 px-[18px] py-3.5">
          <p className="text-xs font-medium text-gray-500">{item.label}</p>
          <p className={cn('text-[20px] font-bold', item.highlight ? 'text-brand' : 'text-gray-900')}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

// ---------- 배지 ----------
const STATUS_TONE: Record<ApplicationStatus, string> = {
  PREPARING: 'bg-gray-100 text-gray-500',
  SUBMITTED: 'bg-brand text-white',
  INQUIRY: 'bg-amber-50 text-amber-500',
  WAITING: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-brand-soft text-brand',
  REJECTED: 'bg-red-50 text-red-500',
  ATTENDED: 'bg-green-50 text-green-600',
  CANCELLED: 'bg-gray-100 text-gray-400',
}

const badgeBase = 'inline-flex h-[26px] shrink-0 items-center rounded-[7px] px-2 text-xs font-medium whitespace-nowrap'

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={cn(badgeBase, STATUS_TONE[status])}>{HOST_APPLICATION_STATUS_LABEL[status]}</span>
}

const PREP_TONE: Record<PrepStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-500',
  READY: 'bg-green-50 text-green-600',
  CHECK: 'bg-amber-50 text-amber-500',
}


/** 준비 상태 배지. onClick 을 주면 누를 때마다 다음 상태로 바꿉니다. */
export function PrepBadge({
  status,
  onChange,
  disabled,
}: {
  status: PrepStatus
  onChange?: (next: PrepStatus) => void
  disabled?: boolean
}) {
  if (!onChange) return <span className={cn(badgeBase, PREP_TONE[status])}>{PREP_STATUS_LABEL[status]}</span>
  const next = PREP_ORDER[(PREP_ORDER.indexOf(status) + 1) % PREP_ORDER.length]
  return (
    <button
      type="button"
      disabled={disabled}
      title={`눌러서 '${PREP_STATUS_LABEL[next]}'(으)로 바꾸기`}
      onClick={() => onChange(next)}
      className={cn(badgeBase, PREP_TONE[status], 'hover:opacity-80 disabled:opacity-60')}
    >
      {PREP_STATUS_LABEL[status]}
    </button>
  )
}

/** 18px 둥근 체크 상자 (준비함 = 파란 채움) */
export function PrepCheckbox({
  checked,
  onToggle,
  disabled,
  label,
}: {
  checked: boolean
  onToggle: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'flex size-[18px] shrink-0 items-center justify-center rounded-[5px] transition-colors disabled:opacity-60',
        checked ? 'bg-brand' : 'border-[1.5px] border-gray-300 bg-white hover:border-brand',
      )}
    >
      {checked && <img src={iconCheck} alt="" width={13} height={13} />}
    </button>
  )
}
