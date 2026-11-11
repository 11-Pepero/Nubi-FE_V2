import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { programApi } from '@/api/endpoints'
import type { ApplyMethod } from '@/api/types'
import { useToast } from '@/components/ui'
import { useSelectedGroup } from '@/lib/selectedGroup'
import { DirectApplyModal, type ApplyTarget } from './DirectApplyModal'

/**
 * 카드·목록·상세의 신청 버튼 동작.
 * DIRECT면 바로 신청 모달, 신청 방법을 모르는 수집 공고는 원문 공고(새 창), 그 밖에는 신청 준비 화면(/app/prepare)으로 갑니다.
 */
export function useProgramApply(careIds?: number[]) {
  const { selectedGroup } = useSelectedGroup()
  const navigate = useNavigate()
  const toast = useToast()
  const [target, setTarget] = useState<ApplyTarget | null>(null)

  const apply = (program: ApplyTarget & { applyMethod: ApplyMethod | null; applyUrl?: string | null }) => {
    // 수집 공고는 신청 방법을 몰라서 앱에서 신청을 만들 수 없어요. 원문 공고로 보냅니다.
    if (!program.applyMethod) {
      void openOriginal(program.programId, program.applyUrl, () =>
        toast.show('이 공고는 원문 링크가 없어요. 주최 기관에 직접 문의해 주세요.', { tone: 'error' }),
      )
      return
    }
    if (!selectedGroup) {
      toast.show('먼저 지원 관리에서 참여 그룹을 만들어 주세요.', {
        tone: 'error',
        action: { label: '지원 관리', onClick: () => navigate('/app/support') },
      })
      return
    }
    if (program.applyMethod === 'DIRECT') {
      setTarget({ programId: program.programId, title: program.title })
    } else {
      navigate(`/app/prepare?programId=${program.programId}&groupId=${selectedGroup.id}`)
    }
  }

  const modal = <DirectApplyModal target={target} group={selectedGroup} careIds={careIds} onClose={() => setTarget(null)} />

  return { apply, modal, group: selectedGroup }
}

/**
 * 수집 공고의 원문 페이지를 새 창으로 엽니다. 목록 응답에는 주소가 없어 상세(applyUrl)를 불러옵니다.
 * 팝업 차단을 피하려고 창을 먼저 열고 주소를 나중에 넣습니다.
 */
export async function openOriginal(programId: number, knownUrl?: string | null, onMissing?: () => void) {
  if (knownUrl) {
    window.open(knownUrl, '_blank', 'noopener,noreferrer')
    return
  }
  const win = window.open('', '_blank')
  try {
    const detail = await programApi.detail(programId)
    if (detail.applyUrl && win) {
      win.opener = null
      win.location.href = detail.applyUrl
      return
    }
  } catch {
    // 아래에서 안내
  }
  win?.close()
  onMissing?.()
}
