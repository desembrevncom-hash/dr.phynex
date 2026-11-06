import type { ApprovalState } from '@/lib/approval-basis'

/** Save marker written by guardHomeBannerApproval into the stored approvals JSON (browser-safe). */
export const saveMarker = (approvals: unknown): string | null => {
  const v = (approvals as { _save?: unknown } | null | undefined)?._save
  return typeof v === 'string' && v ? v : null
}

export type ApprovalViewInput = {
  /** Server state paired with a stored draft (`docSave`). */
  state: ApprovalState | undefined
  /** Save marker of the document the form is showing right now. */
  shownSave: string | null | undefined
  canApprove: boolean
  modified: boolean
  busy: boolean
  localeApproved: boolean
  localeName: string
}

/**
 * Whether the Home Page approval button may act, and why not. The basis is only trusted while it
 * belongs to the very save the form shows (`docSave` = shown save marker): a newer basis from
 * the server is never paired with older form content. Pure so it can be unit tested.
 */
export function approvalView(i: ApprovalViewInput): { reason: string | null; stale: boolean } {
  if (!i.state) return { reason: 'Chưa đọc được phiên bản đã lưu. Hãy tải lại trang.', stale: false }
  if (!i.canApprove) return { reason: 'Chỉ biên tập viên và quản trị viên được duyệt.', stale: false }
  if (!i.shownSave || !i.state.docSave || i.state.docSave !== i.shownSave) {
    return {
      reason:
        'Nội dung đang hiển thị không khớp bản đã lưu trên máy chủ (có thể phiên khác vừa lưu). Hãy tải lại trang để xem bản mới nhất trước khi duyệt.',
      stale: true,
    }
  }
  if (i.modified) {
    return { reason: 'Có thay đổi chưa lưu. Hãy lưu bản nháp trước; nút này chỉ duyệt đúng bản đã lưu.', stale: false }
  }
  if (i.busy) return { reason: 'Đang xử lý…', stale: false }
  if (i.localeApproved) return { reason: `Đã duyệt cho ${i.localeName} với cấu hình hiện tại.`, stale: false }
  return { reason: null, stale: false }
}
