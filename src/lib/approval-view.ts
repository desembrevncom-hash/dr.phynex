import type { ApprovalState } from '@/lib/approval-basis'

/** Save marker written by guardHomeBannerApproval into the stored approvals JSON (browser-safe). */
export const saveMarker = (approvals: unknown): string | null => {
  const v = (approvals as { _save?: unknown } | null | undefined)?._save
  return typeof v === 'string' && v ? v : null
}

export type ApprovalViewInput = {
  /** Server state paired with a stored draft (`docSave`, and its `basis`). */
  state: ApprovalState | undefined
  /** Save marker of the document the form is showing right now. */
  shownSave: string | null | undefined
  /**
   * Basis of the document the form was loaded with (`approvalState.shownBasis`, computed by the
   * server from that very document with the same rules as `basis`). Only used for drafts saved
   * before save markers existed.
   */
  loadedShownBasis?: string | null
  canApprove: boolean
  modified: boolean
  busy: boolean
  localeApproved: boolean
  localeName: string
}

export type ApprovalViewResult = {
  reason: string | null
  /** Another save happened; reloading the page shows it and resolves the block. */
  stale: boolean
  /** Old draft without a save marker that cannot be matched; a draft save resolves the block. */
  legacy: boolean
}

export const staleMessage =
  'Nội dung đã thay đổi ở phiên khác: bản đã lưu trên máy chủ khác nội dung đang hiển thị. Hãy tải lại trang để xem bản mới nhất trước khi duyệt.'
export const legacyMessage =
  'Bản nháp cũ cần cập nhật: bản nháp này được lưu trước khi có cơ chế đối chiếu nên chưa so được với nội dung đang hiển thị. Bấm "Cập nhật bản nháp để tiếp tục duyệt" (chỉ lưu nháp, không duyệt, không xuất bản).'

const result = (reason: string | null, extra: Partial<ApprovalViewResult> = {}): ApprovalViewResult => ({
  reason,
  stale: false,
  legacy: false,
  ...extra,
})

/**
 * Whether the Home Page approval button may act, and why not. The basis is only trusted while it
 * provably belongs to the content the form shows:
 * - normal case: the form's save marker equals the marker of the stored draft (`docSave`);
 * - old draft saved before markers existed (neither side has one): the stored draft's `basis` must
 *   equal the basis the server computed from the very document the form was loaded with
 *   (`loadedShownBasis`, same canonical rules). Missing markers alone never unlock the button;
 *   when no such comparison is possible the user is offered a draft save instead.
 * A newer basis from the server is never paired with older form content. Pure, unit tested.
 */
export function approvalView(i: ApprovalViewInput): ApprovalViewResult {
  if (!i.state) return result('Chưa đọc được phiên bản đã lưu. Hãy tải lại trang.')
  if (!i.canApprove) return result('Chỉ biên tập viên và quản trị viên được duyệt.')
  const shown = i.shownSave || null
  const stored = i.state.docSave || null
  if (shown || stored) {
    if (!shown || !stored || shown !== stored) return result(staleMessage, { stale: true })
  } else if (!i.loadedShownBasis) {
    // Old draft and nothing to compare against: saving the draft is the only reliable fix.
    if (i.modified) return result('Có thay đổi chưa lưu. Hãy lưu bản nháp trước; nút này chỉ duyệt đúng bản đã lưu.')
    return result(legacyMessage, { legacy: true })
  } else if (i.loadedShownBasis !== i.state.basis) {
    return result(staleMessage, { stale: true })
  }
  if (i.modified) {
    return result('Có thay đổi chưa lưu. Hãy lưu bản nháp trước; nút này chỉ duyệt đúng bản đã lưu.')
  }
  if (i.busy) return result('Đang xử lý…')
  if (i.localeApproved) return result(`Đã duyệt cho ${i.localeName} với cấu hình hiện tại.`)
  return result(null)
}
