// 18 로그인
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui'
import linkIcon from '@/assets/icons/auth-link.svg'
import { AuthHeader, AuthHeaderLink } from './AuthHeader'
import { AuthField, AuthInput, CheckBox, PasswordInput } from './AuthField'

function redirectTarget(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  if (typeof from === 'string' && from.startsWith('/app')) return from
  if (from && typeof from === 'object' && 'pathname' in from) {
    const loc = from as { pathname: string; search?: string; hash?: string }
    if (loc.pathname.startsWith('/app')) return `${loc.pathname}${loc.search ?? ''}${loc.hash ?? ''}`
  }
  return '/app'
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // 토큰은 항상 localStorage에 남습니다. 체크박스는 화면 표시용입니다.
  const [keep, setKeep] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await login({ email: email.trim(), password })
      navigate(redirectTarget(location.state), { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <AuthHeader right={<AuthHeaderLink question="처음이신가요?" label="기관 가입하기" to="/signup" />} />
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[68px]">
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[400px] flex-col gap-[18px]">
          <div className="flex flex-col gap-2 pb-2.5">
            <h1 className="text-[28px] font-bold text-gray-900">다시 오셨네요</h1>
            <p className="text-[15px] text-gray-500">기관 담당자 계정으로 로그인해 주세요.</p>
          </div>

          <AuthField label="이메일">
            <AuthInput
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="welfare@oo-center.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </AuthField>

          <AuthField label="비밀번호">
            <PasswordInput
              autoComplete="current-password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </AuthField>

          <div className="flex w-full items-center gap-2">
            <CheckBox checked={keep} onChange={setKeep}>
              <span className="text-[13.5px] text-gray-600">로그인 유지</span>
            </CheckBox>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setNotice('비밀번호 찾기는 준비 중이에요. 기관 관리자에게 문의해 주세요.')}
              className="text-[13.5px] font-medium text-gray-500 hover:text-gray-900"
            >
              비밀번호 찾기
            </button>
          </div>

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            로그인
          </Button>

          {error && (
            <p role="alert" className="-mt-1.5 text-[13px] text-red-500">
              {error}
            </p>
          )}
          {notice && !error && <p className="-mt-1.5 text-[13px] text-gray-500">{notice}</p>}

          <div className="flex w-full items-center gap-3 py-1.5">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[12.5px] text-gray-400">또는</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={() => setNotice('초대 링크로 합류하는 기능은 준비 중이에요. 지금은 기관 가입으로 시작해 주세요.')}
            className="flex w-full items-center gap-3 rounded-xl bg-gray-50 px-4 py-3.5 text-left hover:bg-gray-100"
          >
            <img src={linkIcon} alt="" className="shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[14px] font-bold text-gray-900">초대 링크를 받았나요?</span>
              <span className="text-[12.5px] text-gray-500">같은 기관 담당자가 보낸 링크로 들어오면 바로 합류해요.</span>
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
