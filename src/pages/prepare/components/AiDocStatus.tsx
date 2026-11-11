import type { ApplicationDocument } from '@/api/types'

/** 신청서 위에 붙는 AI 상태 한 줄: 쓰는 중 / 실패(기본 문구) / AI 없이 쓴 초안 / 준비 전 안내 */
export function AiDocStatus({
  started,
  writing,
  failed,
  aiWritten,
}: {
  started: boolean
  writing: boolean
  failed: boolean
  aiWritten: boolean | null
}) {
  if (writing) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-2.5 text-[13px] font-medium text-brand">
        <span aria-hidden className="inline-block size-3.5 animate-spin rounded-full border-2 border-brand border-r-transparent" />
        AI가 신청서를 쓰고 있어요… 몇 초 걸릴 수 있어요.
      </p>
    )
  }
  if (failed) {
    return (
      <p role="status" className="rounded-xl bg-amber-50 px-4 py-2.5 text-[13px] text-gray-700">
        AI 신청서를 쓰지 못해 기본 문구로 채웠어요. 다시 쓰기를 눌러 한 번 더 시도해 보세요.
      </p>
    )
  }
  if (aiWritten === false) {
    return (
      <p className="rounded-xl bg-gray-50 px-4 py-2.5 text-[13px] text-gray-600">
        AI 없이 쓴 초안이에요. 보내기 전에 내용을 한 번 확인해 주세요.
      </p>
    )
  }
  if (!started) {
    return <p className="text-xs text-gray-500">신청 준비를 시작하면 AI가 신청서와 문의 문자, 통화 대본을 써 드려요.</p>
  }
  return null
}

export function PdfButton({
  doc,
  onDownload,
  downloadingId,
}: {
  doc: ApplicationDocument
  onDownload: (doc: ApplicationDocument) => void
  downloadingId: number | null
}) {
  const busy = downloadingId === doc.documentId
  return (
    <button
      type="button"
      className="text-[12.5px] font-medium whitespace-nowrap text-gray-500 hover:text-gray-900 disabled:text-gray-300"
      disabled={busy}
      onClick={() => onDownload(doc)}
    >
      {busy ? '받는 중…' : 'PDF로 받기'}
    </button>
  )
}
