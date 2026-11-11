// 01 지원 관리 · 공통 지원 (/app/support) / 02 개별 케어 명단 (/app/support/care)
import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { carePersonApi, groupApi } from '@/api/endpoints'
import type { Group } from '@/api/types'
import { Button, PageHeader, UnderlineTabs } from '@/components/ui'
import { qk } from '@/lib/queryKeys'
import { CarePanel } from './CarePanel'
import { CareTab } from './CareTab'
import { GroupFormModal } from './GroupFormModal'
import { GroupsTab } from './GroupsTab'

type Tab = 'groups' | 'care'

export default function SupportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const tab: Tab = location.pathname.replace(/\/$/, '').endsWith('/care') ? 'care' : 'groups'

  const groupsQuery = useQuery({ queryKey: qk.groups, queryFn: groupApi.list })
  const careCountQuery = useQuery({ queryKey: qk.carePersons(), queryFn: () => carePersonApi.list() })

  // 그룹 모달: undefined = 닫힘, null = 새로 만들기
  const [groupModal, setGroupModal] = useState<Group | null | undefined>(undefined)
  // 케어 패널: undefined = 닫힘, null = 추가
  const [carePanel, setCarePanel] = useState<number | null | undefined>(undefined)
  const closeGroupModal = useCallback(() => setGroupModal(undefined), [])
  const closeCarePanel = useCallback(() => setCarePanel(undefined), [])

  const filterGroupId = tab === 'care' && params.get('groupId') ? Number(params.get('groupId')) : null

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="지원 관리"
        actions={
          <>
            <Button variant="outline" onClick={() => setCarePanel(null)}>
              개별 케어 추가
            </Button>
            <Button onClick={() => setGroupModal(null)}>공통 지원 그룹 만들기</Button>
          </>
        }
      />
      <UnderlineTabs<Tab>
        value={tab}
        onChange={(v) => navigate(v === 'care' ? '/app/support/care' : '/app/support')}
        items={[
          { value: 'groups', label: '공통 지원', count: groupsQuery.data?.length ?? null },
          { value: 'care', label: '개별 케어 명단', count: careCountQuery.data?.length ?? null },
        ]}
      />

      {tab === 'groups' ? (
        <GroupsTab onCreate={() => setGroupModal(null)} onEdit={(g) => setGroupModal(g)} />
      ) : (
        <CareTab onAdd={() => setCarePanel(null)} onEdit={(id) => setCarePanel(id)} />
      )}

      {groupModal !== undefined && <GroupFormModal group={groupModal} onClose={closeGroupModal} />}
      {carePanel !== undefined && <CarePanel careId={carePanel} defaultGroupId={filterGroupId} onClose={closeCarePanel} />}
    </div>
  )
}
