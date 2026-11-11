// 19~21 기관 가입 (1 기관 정보 → 2 담당자 계정 → 3 가입 완료)
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage } from '@/api/client'
import type { OrganizationType } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui'
import { ORGANIZATION_TYPE_LABEL } from '@/lib/labels'
import { cn } from '@/lib/format'
import pinIcon from '@/assets/icons/auth-pin.svg'
import infoIcon from '@/assets/icons/auth-info.svg'
import doneIcon from '@/assets/icons/auth-done.svg'
import chevronIcon from '@/assets/icons/auth-chevron-right.svg'
import { AuthHeader, AuthHeaderLink } from './AuthHeader'
import { AuthField, AuthInput, CheckBox, PasswordInput } from './AuthField'
import { SignUpSteps } from './SignUpSteps'

type Step = 1 | 2 | 3

interface OrgForm {
  orgName: string
  type: OrganizationType | null
  address: string
  phone: string
  /** 디자인의 "함께 다니는 이용자 수" — API에 없어 보내지 않습니다. */
  memberCount: string
}

interface AccountForm {
  /** 담당자 이름·연락처 — API에 없어 보내지 않습니다. */
  name: string
  contact: string
  email: string
  password: string
  passwordConfirm: string
}

const ORG_TYPES = Object.keys(ORGANIZATION_TYPE_LABEL) as OrganizationType[]

const AGREEMENTS = [
  { key: 'terms', label: '서비스 이용약관 (필수)' },
  { key: 'privacy', label: '개인정보 처리방침 (필수)' },
  { key: 'noPersonal', label: '이용자 실명과 진단명은 올리지 않아요 (필수)' },
] as const
type AgreementKey = (typeof AGREEMENTS)[number]['key']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DISTRICT_NAMES = ['처인구', '기흥구', '수지구'] as const
function districtOf(address: string) {
  return DISTRICT_NAMES.find((d) => address.includes(d)) ?? null
}

function passwordProblem(pw: string): string | null {
  if (pw.length < 8 || pw.length > 64) return '비밀번호는 8자 이상 64자 이하로 써 주세요.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return '영문과 숫자를 함께 써 주세요.'
  return null
}

export default function SignUpPage() {
  const [step, setStep] = useState<Step>(1)
  const [org, setOrg] = useState<OrgForm>({ orgName: '', type: null, address: '', phone: '', memberCount: '' })
  const [account, setAccount] = useState<AccountForm>({ name: '', contact: '', email: '', password: '', passwordConfirm: '' })

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <AuthHeader right={step < 3 ? <AuthHeaderLink question="이미 계정이 있나요?" label="로그인" to="/login" /> : undefined} />
      <div className="flex flex-1 justify-center px-4 pt-9 pb-16">
        <div className="flex w-full max-w-[560px] flex-col gap-[22px]">
          <SignUpSteps step={step} />
          {step === 1 && <OrgStep value={org} onChange={setOrg} onNext={() => setStep(2)} />}
          {step === 2 && (
            <AccountStep org={org} value={account} onChange={setAccount} onPrev={() => setStep(1)} onDone={() => setStep(3)} />
          )}
          {step === 3 && <DoneStep />}
        </div>
      </div>
    </div>
  )
}

function StepTitle({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[26px] font-bold text-gray-900">{title}</h1>
      <p className="text-[14px] text-gray-500">{description}</p>
    </div>
  )
}

/* ───────── 1 기관 정보 ───────── */

function OrgStep({ value, onChange, onNext }: { value: OrgForm; onChange: (v: OrgForm) => void; onNext: () => void }) {
  const [tried, setTried] = useState(false)
  const set = <K extends keyof OrgForm>(key: K, v: OrgForm[K]) => onChange({ ...value, [key]: v })

  const errors = {
    orgName: !value.orgName.trim() ? '기관 이름을 적어 주세요.' : null,
    type: !value.type ? '기관 유형을 골라 주세요.' : null,
    address: !value.address.trim() ? '주소를 적어 주세요.' : null,
  }
  const district = districtOf(value.address)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (errors.orgName || errors.type || errors.address) return
    onNext()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-[22px]">
      <StepTitle title="어떤 기관인가요?" description="기관 정보는 다른 기관이 행사에 신청할 때 함께 보여요." />

      <AuthField label="기관 이름" error={tried ? errors.orgName : null}>
        <AuthInput
          maxLength={100}
          placeholder="용인 ○○ 주간보호센터"
          value={value.orgName}
          invalid={tried && !!errors.orgName}
          onChange={(e) => set('orgName', e.target.value)}
        />
      </AuthField>

      <div className="flex flex-col gap-2">
        <span className="text-[13.5px] font-bold text-gray-700">기관 유형</span>
        <div role="radiogroup" aria-label="기관 유형" className="flex flex-wrap gap-2">
          {ORG_TYPES.map((t) => {
            const active = value.type === t
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set('type', t)}
                className={cn(
                  'h-9 rounded-[18px] border px-[15px] text-[13.5px] whitespace-nowrap transition-colors',
                  active ? 'border-brand bg-brand-soft font-bold text-brand' : 'border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50',
                )}
              >
                {ORGANIZATION_TYPE_LABEL[t]}
              </button>
            )
          })}
        </div>
        {tried && errors.type && <span className="text-[12.5px] text-red-500">{errors.type}</span>}
      </div>

      <div className="flex flex-col gap-2.5">
        <AuthField label="주소" error={tried ? errors.address : null}>
          <div
            className={cn(
              'flex h-[50px] w-full items-center gap-2 rounded-xl border bg-white pr-3.5 pl-4 focus-within:border-brand focus-within:ring-[0.5px] focus-within:ring-brand',
              tried && errors.address ? 'border-red-500' : 'border-gray-200',
            )}
          >
            <img src={pinIcon} alt="" className="shrink-0" />
            <input
              maxLength={200}
              placeholder="경기 용인시 처인구 금령로 ○○"
              value={value.address}
              onChange={(e) => set('address', e.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </AuthField>
        {value.address.trim() && (
          <div className="flex items-start gap-2.5 rounded-xl bg-brand-soft px-3.5 py-3">
            <img src={infoIcon} alt="" className="mt-px shrink-0" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13.5px] font-bold text-gray-900">
                {district ? `용인시 ${district} 기관으로 등록돼요` : '구 이름을 함께 적어 주세요'}
              </span>
              <span className="text-[12.5px] text-gray-500">
                {district
                  ? '사각지대 지도와 지역 통계에 이 구로 함께 보여요.'
                  : '주소에 처인구·기흥구·수지구가 들어 있으면 지도에 우리 기관 구가 표시돼요.'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <AuthField label="대표 전화" className="flex-1">
          <AuthInput
            type="tel"
            maxLength={20}
            placeholder="031-000-0000"
            value={value.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </AuthField>
        <AuthField label="함께 다니는 이용자 수" className="flex-1">
          <AuthInput
            inputMode="numeric"
            placeholder="예: 19명"
            value={value.memberCount}
            onChange={(e) => set('memberCount', e.target.value.replace(/[^\d]/g, ''))}
          />
        </AuthField>
      </div>

      <div className="flex items-center pt-1.5">
        <div className="flex-1" />
        <Button type="submit" size="lg" className="w-40">
          다음
        </Button>
      </div>
    </form>
  )
}

/* ───────── 2 담당자 계정 ───────── */

function AccountStep({
  org,
  value,
  onChange,
  onPrev,
  onDone,
}: {
  org: OrgForm
  value: AccountForm
  onChange: (v: AccountForm) => void
  onPrev: () => void
  onDone: () => void
}) {
  const { signUp } = useAuth()
  const [tried, setTried] = useState(false)
  const [agreed, setAgreed] = useState<Record<AgreementKey, boolean>>({ terms: false, privacy: false, noPersonal: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof AccountForm>(key: K, v: AccountForm[K]) => onChange({ ...value, [key]: v })

  const allAgreed = AGREEMENTS.every((a) => agreed[a.key])
  const errors = {
    email: !value.email.trim() ? '이메일을 적어 주세요.' : !EMAIL_RE.test(value.email.trim()) ? '이메일 형식을 확인해 주세요.' : null,
    password: passwordProblem(value.password),
    passwordConfirm: value.passwordConfirm !== value.password ? '비밀번호가 서로 달라요.' : null,
    agreements: allAgreed ? null : '필수 항목에 모두 동의해 주세요.',
  }
  const hasError = Object.values(errors).some(Boolean)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    setError(null)
    if (hasError || !org.type) return
    setSubmitting(true)
    try {
      await signUp({
        orgName: org.orgName.trim(),
        type: org.type,
        address: org.address.trim(),
        phone: org.phone.trim() || undefined,
        email: value.email.trim(),
        password: value.password,
      })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-[22px]">
      <StepTitle title="담당자 계정을 만들어요" description="첫 담당자는 기관 관리자가 돼요. 다른 담당자는 가입 뒤 초대할 수 있어요." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <AuthField label="이름" className="flex-1">
          <AuthInput autoComplete="name" placeholder="최정원" value={value.name} onChange={(e) => set('name', e.target.value)} />
        </AuthField>
        <AuthField label="연락처" className="flex-1">
          <AuthInput type="tel" autoComplete="tel" placeholder="010-0000-0000" value={value.contact} onChange={(e) => set('contact', e.target.value)} />
        </AuthField>
      </div>

      <AuthField label="이메일" hint="로그인할 때 쓰는 주소예요" error={tried ? errors.email : null}>
        <AuthInput
          type="email"
          autoComplete="email"
          maxLength={100}
          placeholder="welfare@oo-center.kr"
          value={value.email}
          invalid={tried && !!errors.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </AuthField>

      <AuthField label="비밀번호" hint="8자 이상, 영문과 숫자를 함께 써 주세요" error={tried ? errors.password : null}>
        <PasswordInput
          autoComplete="new-password"
          maxLength={64}
          placeholder="비밀번호"
          value={value.password}
          invalid={tried && !!errors.password}
          onChange={(e) => set('password', e.target.value)}
        />
      </AuthField>

      <AuthField label="비밀번호 확인" error={tried ? errors.passwordConfirm : null}>
        <PasswordInput
          autoComplete="new-password"
          maxLength={64}
          placeholder="한 번 더 입력"
          value={value.passwordConfirm}
          invalid={tried && !!errors.passwordConfirm}
          onChange={(e) => set('passwordConfirm', e.target.value)}
        />
      </AuthField>

      <div className={cn('flex flex-col gap-3.5 rounded-xl border px-4 py-4', tried && errors.agreements ? 'border-red-500' : 'border-gray-200')}>
        <CheckBox
          checked={allAgreed}
          onChange={(c) => setAgreed({ terms: c, privacy: c, noPersonal: c })}
        >
          <span className="text-[14px] font-bold text-gray-900">모두 동의</span>
        </CheckBox>
        <div className="h-px bg-gray-200" />
        {AGREEMENTS.map((a) => (
          <CheckBox key={a.key} checked={agreed[a.key]} onChange={(c) => setAgreed((prev) => ({ ...prev, [a.key]: c }))}>
            <span className="text-[13.5px] text-gray-600">{a.label}</span>
          </CheckBox>
        ))}
      </div>
      {tried && errors.agreements && <p className="-mt-3 text-[12.5px] text-red-500">{errors.agreements}</p>}

      {error && (
        <p role="alert" className="text-[13px] text-red-500">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button variant="outline" size="lg" className="w-[100px]" onClick={onPrev} disabled={submitting}>
          이전
        </Button>
        <div className="flex-1" />
        <Button type="submit" size="lg" className="w-40" loading={submitting}>
          가입하기
        </Button>
      </div>
    </form>
  )
}

/* ───────── 3 가입 완료 ───────── */

const NEXT_STEPS: { title: string; description: string; meta: string; to: string | null }[] = [
  { title: '공통 지원 그룹 만들기', description: '몇 명이 함께 다니고 어떤 지원이 필요한지 적어요', meta: '약 3분', to: '/app/support' },
  { title: '개별 케어 명단 추가', description: '공통 외에 따로 챙길 분을 별칭으로 적어요', meta: '선택', to: '/app/support/care' },
  // 담당자 초대는 백엔드 API가 없어 안내만 합니다.
  { title: '다른 담당자 초대', description: '같은 기관 선생님을 링크로 불러요', meta: '준비 중', to: null },
]

function DoneStep() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-7 pt-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-[72px] items-center justify-center rounded-full bg-brand-soft">
          <img src={doneIcon} alt="" />
        </span>
        <h1 className="pt-1 text-[28px] font-bold text-gray-900">가입을 마쳤어요</h1>
        <p className="text-[15px] text-gray-500">지원 카드를 등록하면 바로 참여 가능한 프로그램을 보여드려요.</p>
      </div>

      <ul className="flex flex-col overflow-hidden rounded-2xl border border-gray-200">
        {NEXT_STEPS.map((s, i) => {
          const body = (
            <>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[13px] font-bold text-gray-700">{i + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold text-gray-900">{s.title}</span>
                <span className="text-[13px] text-gray-500">{s.description}</span>
              </span>
              <span className="shrink-0 text-[12.5px] text-gray-400">{s.meta}</span>
              {s.to && <img src={chevronIcon} alt="" className="shrink-0" />}
            </>
          )
          return (
            <li key={s.title} className={cn(i > 0 && 'border-t border-gray-200')}>
              {s.to ? (
                <Link to={s.to} className="flex h-[68px] items-center gap-3.5 px-5 hover:bg-gray-50">
                  {body}
                </Link>
              ) : (
                <div className="flex h-[68px] items-center gap-3.5 px-5 opacity-70">{body}</div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col items-center gap-5">
        <Button size="lg" className="w-full" onClick={() => navigate('/app/support')}>
          지원 카드 등록하러 가기
        </Button>
        <Link to="/app/programs" className="text-[13.5px] font-medium text-gray-500 hover:text-gray-900">
          나중에 할게요, 프로그램부터 둘러보기
        </Link>
      </div>
    </div>
  )
}
