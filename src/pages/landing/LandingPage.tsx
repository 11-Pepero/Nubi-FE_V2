// 17 메인 (소개)
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/format'
import { Logo } from '@/components/brand/Logo'
import { SplashIntro } from '@/components/brand/SplashIntro'
import cardIcon from '@/assets/icons/landing-card.svg'
import filterIcon from '@/assets/icons/landing-filter.svg'
import penIcon from '@/assets/icons/landing-pen.svg'
import megaphoneIcon from '@/assets/icons/landing-megaphone.svg'
import chevronIcon from '@/assets/icons/landing-chevron-down.svg'

const STATS = [
  { value: '38,206명', label: '용인시 등록장애인', note: '2025.12.31 기준' },
  { value: '43곳', label: '장애인복지시설', note: '처인 23 · 기흥 17 · 수지 3' },
  { value: '1,083건', label: '용인시 프로그램 공고', note: '5개 데이터 누적' },
  { value: '0건', label: '접근성 정보가 적힌 공고', note: '휠체어, 화장실, 동반 정보 없음', highlight: true },
]

const FEATURES = [
  { icon: cardIcon, title: '지원 카드 한 번 등록', body: '그룹마다 휠체어, 동반, 쉬운 말 안내처럼 필요한 지원만 적어요. 이름과 진단명은 받지 않아요.' },
  { icon: filterIcon, title: '참여 가능한 곳만 골라 보기', body: '흩어진 공고를 AI가 읽어 조건을 뽑고, 우리 그룹 기준으로 참여 가능, 확인 필요를 나눠 보여줘요.' },
  { icon: penIcon, title: '신청서와 문의문은 AI가', body: '외부 공고도 신청서 초안, 통화 요약, 문의 문자를 바로 만들어요. 접수는 담당자가 확인해요.' },
  { icon: megaphoneIcon, title: '우리 기관 행사도 알리기', body: '행사를 올리면 다른 기관이 지원 카드로 신청하고, 필요한 지원이 한 번에 모여요.' },
]

const FLOW = [
  { title: '기관 가입', body: '기관 정보와 담당자 계정' },
  { title: '지원 카드 등록', body: '그룹과 개별 케어' },
  { title: '참여 가능 목록', body: '바로 신청 또는 신청 준비' },
  { title: '다녀와서 후기', body: '다음 기관의 판정에 반영' },
]

const FAQ = [
  {
    q: '이용자 개인정보를 올려야 하나요?',
    a: '아니요. 그룹 인원과 필요한 지원만 적고, 따로 챙길 분은 기관이 정한 별칭으로만 관리해요.',
  },
  {
    q: '외부 기관 프로그램도 대신 신청해 주나요?',
    a: '신청서 초안, 통화 요약, 문의 문자는 AI가 만들어 드려요. 실제 접수는 담당자가 내용을 확인한 뒤 직접 해요.',
  },
  {
    q: '참여 가능 판정은 얼마나 믿을 수 있나요?',
    a: '공고 내용, 주최 기관이 적은 정보, 장소 편의시설 공공데이터, 다녀온 기관의 후기를 근거로 판정해요. 근거가 부족하면 "확인 필요"로 따로 보여드려요.',
  },
  {
    q: '이용 요금이 있나요?',
    a: '용인 지역 장애인 기관이라면 가입과 이용 모두 무료예요.',
  },
]

export default function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <SplashIntro />
      <Hero isAuthenticated={isAuthenticated} />
      <Numbers />
      <Features />
      <Flow />
      <Faq />
      <Cta isAuthenticated={isAuthenticated} />
      <footer className="flex w-full items-center gap-4 border-t border-gray-100 px-6 py-[30px] md:px-[120px]">
        <Logo size={24} textClassName="text-[15px]" />
        <div className="flex-1" />
        <span className="text-right text-[13px] text-gray-400">용용톤 11팀 · 2026 용인 공공데이터 AI 해커톤</span>
      </footer>
    </div>
  )
}

/* ───────── Hero ───────── */

function Corner({ className }: { className: string }) {
  return <span aria-hidden className={cn('absolute size-[22px] border-gray-900', className)} />
}

function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="flex w-full flex-col items-center px-6 pt-6 pb-[120px]">
      <header className="flex w-full max-w-[1280px] items-center gap-5">
        <Link to="/" aria-label="Nubi 홈">
          <Logo size={30} textClassName="text-[20px]" />
        </Link>
        <div className="flex-1" />
        <nav className="hidden items-center gap-5 text-[14px] font-medium text-gray-600 md:flex">
          <a href="#features" className="hover:text-gray-900">
            서비스 소개
          </a>
          <a href="#flow" className="hover:text-gray-900">
            이용 방법
          </a>
          <a href="#faq" className="hover:text-gray-900">
            자주 묻는 질문
          </a>
        </nav>
        {isAuthenticated ? (
          <Link
            to="/app"
            className="flex h-[38px] items-center rounded-[19px] bg-gray-900 px-5 text-[13.5px] font-bold whitespace-nowrap text-white hover:bg-gray-800"
          >
            바로가기
          </Link>
        ) : (
          <>
            <Link to="/login" className="text-[14px] font-medium whitespace-nowrap text-gray-600 hover:text-gray-900">
              로그인
            </Link>
            <Link
              to="/signup"
              className="flex h-[38px] items-center rounded-[19px] bg-gray-900 px-5 text-[13.5px] font-bold whitespace-nowrap text-white hover:bg-gray-800"
            >
              기관 가입하기
            </Link>
          </>
        )}
      </header>

      <span aria-hidden className="h-[130px] w-px bg-gray-200" />

      <div className="relative flex w-full max-w-[730px] flex-col items-center px-6 py-[52px] text-center sm:px-16">
        <Corner className="top-0 left-0 rounded-tl-md border-t-2 border-l-2" />
        <Corner className="top-0 right-0 rounded-tr-md border-t-2 border-r-2" />
        <Corner className="bottom-0 left-0 rounded-bl-md border-b-2 border-l-2" />
        <Corner className="right-0 bottom-0 rounded-br-md border-r-2 border-b-2" />

        <p className="text-[15px] font-bold text-brand">용인 공공데이터로 찾는 참여 가능 프로그램</p>
        <h1 className="mt-5 text-[34px] leading-[1.35] font-bold break-keep text-gray-900 sm:text-[52px]">
          함께 갈 수 있는 곳,
          <br />
          이제 묻지 않고 바로 찾아요
        </h1>
        <p className="mt-5 max-w-[567px] break-keep text-[16px] leading-[1.7] text-gray-500 sm:text-[17px]">
          기관이 이용자 지원 정보를 한 번 등록하면, 참여할 수 있는 프로그램만 골라 보여주고 신청서와 문의문까지 AI가 대신 써 드려요.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            to={isAuthenticated ? '/app' : '/signup'}
            className="flex h-[52px] items-center rounded-xl bg-brand px-5 text-[16px] font-bold text-white hover:bg-brand-strong"
          >
            우리 기관 시작하기
          </Link>
          <Link
            to={isAuthenticated ? '/app/programs' : '/login'}
            className="flex h-[52px] items-center rounded-xl border border-gray-200 bg-white px-5 text-[16px] font-bold text-gray-700 hover:bg-gray-50"
          >
            프로그램 둘러보기
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ───────── 왜 필요한가요 ───────── */

function SectionEyebrow({ children }: { children: string }) {
  return <p className="text-[14px] font-bold text-brand">{children}</p>
}

function Numbers() {
  return (
    <section className="flex w-full justify-center bg-gray-50 px-6 pt-[110px] pb-10 md:px-[120px]">
      <div className="flex w-full max-w-[1200px] flex-col">
        <SectionEyebrow>왜 필요한가요</SectionEyebrow>
        <h2 className="mt-4 max-w-[900px] text-[28px] leading-[1.35] font-bold text-gray-900 md:text-[40px]">
          사람도, 시설도, 프로그램도 많은데 함께 갈 수 있는지는 아무도 적어 두지 않았어요.
        </h2>
        <ul className="mt-11 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <li key={s.label} className="flex flex-col rounded-2xl bg-white px-7 py-[26px]">
              <span className={cn('text-[34px] font-bold', s.highlight ? 'text-red-500' : 'text-gray-900')}>{s.value}</span>
              <span className="mt-1.5 text-[15px] font-bold text-gray-700">{s.label}</span>
              <span className="mt-1.5 text-[13px] text-gray-400">{s.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] text-gray-400">
          출처: 공공데이터포털 용인시 등록장애인 현황, 용인시 장애인복지시설 현황, 용인시 프로그램 공고 데이터
        </p>
      </div>
    </section>
  )
}

/* ───────── 할 수 있는 일 ───────── */

function Features() {
  return (
    <section id="features" className="flex w-full scroll-mt-6 justify-center px-6 pt-[100px] pb-10 md:px-[120px]">
      <div className="flex w-full max-w-[1200px] flex-col gap-10 lg:flex-row lg:gap-[60px]">
        <div className="flex shrink-0 flex-col gap-3.5 lg:w-[360px]">
          <SectionEyebrow>할 수 있는 일</SectionEyebrow>
          <h2 className="text-[28px] leading-[1.35] font-bold text-gray-900 md:text-[36px]">
            한 번 등록하면
            <br />
            찾기부터 신청까지
          </h2>
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-5 rounded-2xl border border-gray-200 px-7 py-[26px]">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                <img src={f.icon} alt="" />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <h3 className="text-[18px] font-bold text-gray-900">{f.title}</h3>
                <p className="text-[15px] leading-[1.7] text-gray-500">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ───────── 이용 방법 ───────── */

function Flow() {
  return (
    <section id="flow" className="flex w-full scroll-mt-6 flex-col items-center px-6 pt-[100px] pb-10 md:px-[120px]">
      <SectionEyebrow>이용 방법</SectionEyebrow>
      <h2 className="mt-9 text-center text-[28px] font-bold text-gray-900 md:text-[36px]">네 단계면 충분해요</h2>
      <ol className="mt-9 grid w-full max-w-[1200px] grid-cols-2 gap-y-10 lg:grid-cols-4">
        {FLOW.map((s, i) => (
          <li key={s.title} className="flex flex-col items-center text-center">
            <span className="flex size-[120px] flex-col items-center justify-center rounded-full bg-brand-soft">
              <span className="text-[11px] font-bold text-brand/70">STEP</span>
              <span className="text-[26px] font-bold text-brand">{String(i + 1).padStart(2, '0')}</span>
            </span>
            <span className="mt-3 text-[17px] font-bold text-gray-900">{s.title}</span>
            <span className="mt-3 text-[14px] text-gray-500">{s.body}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ───────── 자주 묻는 질문 ───────── */

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="flex w-full scroll-mt-6 justify-center px-6 pt-[100px] pb-10">
      <div className="flex w-full max-w-[960px] flex-col">
        <h2 className="text-[28px] font-bold text-gray-900 md:text-[36px]">자주 묻는 질문</h2>
        <ul className="mt-9 flex flex-col gap-3">
          {FAQ.map((item, i) => {
            const expanded = open === i
            return (
              <li key={item.q} className={cn('rounded-2xl border', expanded ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white')}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? -1 : i)}
                  className="flex w-full items-center gap-3 px-7 py-[22px] text-left"
                >
                  <span className="min-w-0 flex-1 text-[16px] font-bold text-gray-900">{item.q}</span>
                  <img src={chevronIcon} alt="" className={cn('shrink-0 transition-transform', expanded && 'rotate-180')} />
                </button>
                {expanded && <p className="-mt-2.5 px-7 pb-[22px] text-[15px] leading-[1.7] text-gray-500">{item.a}</p>}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ───────── 마지막 CTA ───────── */

function Cta({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="flex w-full flex-col items-center px-6 pt-[110px] pb-[110px] text-center">
      <h2 className="text-[28px] leading-[1.45] font-bold text-gray-900 md:text-[36px]">
        다음 나들이는
        <br />
        함께 갈 수 있는 곳으로
      </h2>
      <Link
        to={isAuthenticated ? '/app' : '/signup'}
        className="mt-5 flex h-[52px] items-center rounded-xl bg-brand px-5 text-[16px] font-bold text-white hover:bg-brand-strong"
      >
        {isAuthenticated ? '바로가기' : '우리 기관 시작하기'}
      </Link>
    </section>
  )
}
