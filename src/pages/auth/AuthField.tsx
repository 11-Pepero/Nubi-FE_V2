import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/format'
import eyeIcon from '@/assets/icons/auth-eye.svg'
import eyeOffIcon from '@/assets/icons/auth-eye-off.svg'
import checkIcon from '@/assets/icons/auth-check.svg'

/** 로그인·가입 폼 한 칸: 13.5px 굵은 라벨 + 50px 입력 + 아래 도움말. */
export function AuthField({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex w-full min-w-0 flex-col gap-2', className)}>
      <span className="text-[13.5px] font-bold text-gray-700">{label}</span>
      {children}
      {error ? (
        <span className="text-[12.5px] text-red-500">{error}</span>
      ) : hint ? (
        <span className="text-[12.5px] text-gray-500">{hint}</span>
      ) : null}
    </label>
  )
}

const inputBase =
  'h-[50px] w-full min-w-0 rounded-xl border border-gray-200 bg-white pr-3.5 pl-4 text-[15px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand focus:ring-[0.5px] focus:ring-brand'

export const AuthInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function AuthInput({ className, invalid, ...rest }, ref) {
    return <input ref={ref} className={cn(inputBase, invalid && 'border-red-500', className)} {...rest} />
  },
)

/** 오른쪽에 눈 아이콘이 있는 비밀번호 입력. */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function PasswordInput({ invalid, ...rest }, ref) {
    const [visible, setVisible] = useState(false)
    return (
      <div
        className={cn(
          'flex h-[50px] w-full items-center gap-2 rounded-xl border bg-white pr-3.5 pl-4 focus-within:border-brand focus-within:ring-[0.5px] focus-within:ring-brand',
          invalid ? 'border-red-500' : 'border-gray-200',
        )}
      >
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
          className="flex size-[18px] shrink-0 items-center justify-center"
        >
          <img src={visible ? eyeOffIcon : eyeIcon} alt="" />
        </button>
      </div>
    )
  },
)

/** 18px 둥근 네모 체크박스 (고르면 파란 바탕 + 흰 체크). */
export function CheckBox({
  checked,
  onChange,
  children,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children?: ReactNode
  className?: string
}) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2', className)}>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        className={cn(
          'flex size-[18px] shrink-0 items-center justify-center rounded-[5px] peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40',
          checked ? 'bg-brand' : 'border-[1.5px] border-gray-300 bg-white',
        )}
      >
        {checked && <img src={checkIcon} alt="" />}
      </span>
      {children}
    </label>
  )
}
