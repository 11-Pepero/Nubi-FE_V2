// 09 참여 가능 프로그램 · 자세히 보기
// 목록(03, 또는 04에서 열었으면 04)을 뒤에 두고 오른쪽 패널로 엽니다. 목록 조건은 주소 쿼리로 이어받습니다.
import { useCallback, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ProgramExplorePage from '@/pages/programs/ProgramExplorePage'
import EligiblePage from './EligiblePage'
import { ProgramDetailPanel } from './components/ProgramDetailPanel'

export default function ProgramDetailPage() {
  const { programId } = useParams()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const fromExplore = sp.get('from') === 'explore'

  const careIds = useMemo(() => {
    const ids = (sp.get('careIds') ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0)
    return ids.length ? ids : undefined
  }, [sp])

  const onClose = useCallback(() => {
    const rest = new URLSearchParams(sp)
    rest.delete('from')
    const s = rest.toString()
    navigate(`${fromExplore ? '/app/programs' : '/app/eligible'}${s ? `?${s}` : ''}`)
  }, [sp, fromExplore, navigate])

  return (
    <>
      {fromExplore ? <ProgramExplorePage /> : <EligiblePage />}
      <ProgramDetailPanel key={programId} programId={Number(programId)} careIds={careIds} onClose={onClose} />
    </>
  )
}
