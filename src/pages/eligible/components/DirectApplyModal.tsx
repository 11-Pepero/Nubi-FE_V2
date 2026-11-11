import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applicationApi, carePersonApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { Group } from '@/api/types'
import { Button, Field, Input, Modal, Textarea, useToast } from '@/components/ui'
import { qk } from '@/lib/queryKeys'
import { supportText } from '@/lib/format'
import { Tag } from './Tag'

export interface ApplyTarget {
  programId: number
  title: string
}

/**
 * 바로 신청 (신청 방법 DIRECT). 그룹 공통 지원과 고른 개별 케어가 그대로 복사됩니다.
 * careIds를 비우면 그룹에서 판정 반영이 켜진 케어를 씁니다(참여 판정과 같은 기준).
 */
export function DirectApplyModal({
  target,
  group,
  careIds,
  onClose,
}: {
  target: ApplyTarget | null
  group: Group | null
  careIds?: number[]
  onClose: () => void
}) {
  return (
    <Modal open={!!target && !!group} onClose={onClose} title="바로 신청" width={520}>
      {target && group && <DirectApplyForm key={`${target.programId}-${group.id}`} target={target} group={group} careIds={careIds} onClose={onClose} />}
    </Modal>
  )
}

function DirectApplyForm({
  target,
  group,
  careIds,
  onClose,
}: {
  target: ApplyTarget
  group: Group
  careIds?: number[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [participantCount, setParticipantCount] = useState(String(group.memberCount || 1))
  const [companionCount, setCompanionCount] = useState('0')
  const [transport, setTransport] = useState('')
  const [message, setMessage] = useState('')

  const caresQuery = useQuery({
    queryKey: qk.carePersons({ groupId: group.id }),
    queryFn: () => carePersonApi.list({ groupId: group.id }),
  })
  const cares = caresQuery.data ?? []
  const chosen = careIds?.length
    ? cares.filter((c) => careIds.includes(c.id) && c.applyToJudgement)
    : cares.filter((c) => c.applyToJudgement)

  const mutation = useMutation({
    mutationFn: () =>
      applicationApi.applyDirect(target.programId, {
        groupId: group.id,
        careIds: chosen.map((c) => c.id),
        participantCount: Number(participantCount) || undefined,
        companionCount: companionCount === '' ? undefined : Number(companionCount),
        transport: transport.trim() || undefined,
        message: message.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      onClose()
      toast.show(`${target.title}에 신청했어요. 주최 기관이 확인하면 알려 드릴게요.`, {
        action: { label: '신청 현황', onClick: () => navigate('/app/applications') },
      })
    },
  })

  const participants = Number(participantCount)
  const invalid = !Number.isInteger(participants) || participants < 1 || participants > 1000 || Number(companionCount) < 0

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!invalid) mutation.mutate()
      }}
    >
      <div className="flex flex-col gap-2 rounded-[14px] bg-gray-50 px-4 py-3.5">
        <p className="text-[14px] font-bold text-gray-900">{target.title}</p>
        <p className="text-[13px] text-gray-600">
          {group.name} · {group.memberCount}명으로 신청해요
        </p>
        {(group.supports.length > 0 || chosen.length > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {group.supports.map((s) => (
              <Tag key={s.supportTagId} tone="white">
                {supportText(s)}
              </Tag>
            ))}
            {chosen.length > 0 && <Tag tone="brand">+ {chosen.map((c) => c.alias).join(', ')}</Tag>}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Field label="참여 인원" hint="정원은 이용자 수로만 세요">
          <Input type="number" min={1} max={1000} value={participantCount} onChange={(e) => setParticipantCount(e.target.value)} />
        </Field>
        <Field label="동반 인력">
          <Input type="number" min={0} max={1000} value={companionCount} onChange={(e) => setCompanionCount(e.target.value)} />
        </Field>
      </div>
      <Field label="이동 방법">
        <Input maxLength={50} placeholder="예: 기관 차량, 장애인 콜택시" value={transport} onChange={(e) => setTransport(e.target.value)} />
      </Field>
      <Field label="주최 기관에 남길 말">
        <Textarea maxLength={1000} placeholder="미리 알려 드릴 점이 있으면 적어 주세요" value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>

      {mutation.isError && <p className="text-[13px] text-red-500">{errorMessage(mutation.error)}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" loading={mutation.isPending} disabled={invalid}>
          신청하기
        </Button>
      </div>
    </form>
  )
}
