import prevIcon from '@/assets/icons/eligible-prev.svg'
import nextIcon from '@/assets/icons/eligible-next.svg'
import { shiftMonth } from './month'

/** ‹ 2026년 11월 › 달 고르기. */
export function MonthPicker({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  const [y, m] = value.split('-')
  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-[18px] border border-gray-200 bg-white px-1">
      <button
        type="button"
        aria-label="이전 달"
        onClick={() => onChange(shiftMonth(value, -1))}
        className="flex size-7 items-center justify-center rounded-full hover:bg-gray-100"
      >
        <img src={prevIcon} alt="" />
      </button>
      <span className="min-w-[88px] text-center text-[13.5px] font-bold text-gray-900">
        {y}년 {Number(m)}월
      </span>
      <button
        type="button"
        aria-label="다음 달"
        onClick={() => onChange(shiftMonth(value, 1))}
        className="flex size-7 items-center justify-center rounded-full hover:bg-gray-100"
      >
        <img src={nextIcon} alt="" />
      </button>
    </div>
  )
}
