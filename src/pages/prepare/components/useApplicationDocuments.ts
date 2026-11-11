import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { applicationApi } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { ApplicationDocument, ApplicationDocuments, DocumentType } from '@/api/types'
import { useToast } from '@/components/ui'

/**
 * 신청(applicationId)이 생기면 AI 신청서(신청서·문의 문자·통화 대본)를 한 번 써 둡니다.
 * 실패하면 화면은 기본 문구(클라이언트 템플릿)로 계속 쓸 수 있게 error만 남깁니다.
 */
export function useApplicationDocuments(applicationId: number | null) {
  const toast = useToast()
  const [result, setResult] = useState<ApplicationDocuments | null>(null)
  const [failed, setFailed] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const write = useMutation({
    mutationFn: (id: number) => applicationApi.writeDocuments(id),
    onSuccess: (res) => {
      setResult(res)
      setFailed(false)
    },
    onError: (e) => {
      setFailed(true)
      toast.show(`AI 신청서를 쓰지 못했어요. ${errorMessage(e)}`, { tone: 'error' })
    },
  })
  const { mutate } = write

  // 신청이 생기거나 바뀌면 한 번만 자동으로 씁니다. (다시 부르면 서버가 새로 써요)
  const requested = useRef<number | null>(null)
  useEffect(() => {
    if (applicationId && requested.current !== applicationId) {
      requested.current = applicationId
      mutate(applicationId)
    }
  }, [applicationId, mutate])

  const docs = result && result.applicationId === applicationId ? result : null
  const byType = (type: DocumentType): ApplicationDocument | null => docs?.documents.find((d) => d.type === type) ?? null

  const rewrite = () => applicationId && mutate(applicationId)

  const downloadPdf = async (doc: ApplicationDocument) => {
    if (!applicationId) return
    setDownloadingId(doc.documentId)
    try {
      await applicationApi.downloadDocumentPdf(applicationId, doc.documentId)
    } catch (e) {
      toast.show(errorMessage(e), { tone: 'error' })
    } finally {
      setDownloadingId(null)
    }
  }

  return {
    docs,
    form: byType('FORM'),
    inquiry: byType('INQUIRY'),
    callScript: byType('CALL_SCRIPT'),
    writing: write.isPending,
    failed: failed && !write.isPending,
    rewrite,
    downloadPdf,
    downloadingId,
  }
}
