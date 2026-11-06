import { describe, expect, it } from 'vitest'

import type { ApprovalState } from '@/lib/approval-basis'
import {
  approvalView,
  legacyMessage,
  staleMessage,
  type ApprovalViewInput,
} from '@/lib/approval-view'

const BASIS = 'a'.repeat(64)
const OTHER = 'c'.repeat(64)
const state = (docSave: string | null, basis = BASIS): ApprovalState => ({
  locale: 'vi',
  basis,
  revision: 'b'.repeat(64),
  approved: { ko: false, en: false, vi: false },
  status: 'in-review',
  docSave,
})
const base = (over: Partial<ApprovalViewInput> = {}): ApprovalViewInput => ({
  state: state('save-1'),
  shownSave: 'save-1',
  canApprove: true,
  modified: false,
  busy: false,
  localeApproved: false,
  localeName: 'tiếng Việt',
  ...over,
})
const legacy = (over: Partial<ApprovalViewInput> = {}) =>
  base({ state: state(null), shownSave: null, ...over })

describe('approval panel never pairs a newer basis with older form content', () => {
  it('allows approval when the basis belongs to the save the form shows', () => {
    expect(approvalView(base())).toEqual({ reason: null, stale: false, legacy: false })
  })
  it('after a save: a basis for a newer stored draft than the form shows is refused (stale)', () => {
    const v = approvalView(base({ state: state('save-2') }))
    expect(v).toEqual({ reason: staleMessage, stale: true, legacy: false })
    expect(v.reason).toMatch(/Nội dung đã thay đổi ở phiên khác/)
  })
  it('a basis older than the shown save is refused too', () => {
    expect(approvalView(base({ shownSave: 'save-0' })).stale).toBe(true)
  })
  it('refuses when only one side has a save marker', () => {
    expect(approvalView(base({ shownSave: undefined })).stale).toBe(true)
    expect(approvalView(base({ state: state(null) })).stale).toBe(true)
    expect(approvalView(base({ shownSave: '' })).stale).toBe(true)
  })
  it('keeps the existing locks: permission, unsaved edits, busy, already approved', () => {
    expect(approvalView(base({ canApprove: false })).reason).toMatch(/Chỉ biên tập viên/)
    expect(approvalView(base({ modified: true })).reason).toMatch(/chưa lưu/)
    expect(approvalView(base({ busy: true })).reason).toBe('Đang xử lý…')
    expect(approvalView(base({ localeApproved: true })).reason).toMatch(/Đã duyệt/)
    expect(approvalView(base({ state: undefined })).reason).toMatch(/tải lại/)
  })
})

describe('old drafts saved before save markers existed', () => {
  it('1. no markers on either side but the shown content matches the stored draft: may approve', () => {
    expect(approvalView(legacy({ loadedShownBasis: BASIS }))).toEqual({
      reason: null,
      stale: false,
      legacy: false,
    })
  })
  it('missing markers alone never unlock the button', () => {
    const v = approvalView(legacy({ loadedShownBasis: undefined }))
    expect(v.reason).toBe(legacyMessage)
    expect(v).toMatchObject({ legacy: true, stale: false })
  })
  it('2. both without markers but different content: "changed in another session", reload helps', () => {
    expect(approvalView(legacy({ loadedShownBasis: OTHER }))).toEqual({
      reason: staleMessage,
      stale: true,
      legacy: false,
    })
  })
  it('3. another session saved with a marker meanwhile: stale, never approved from the old form', () => {
    const v = approvalView(legacy({ state: state('save-from-B'), loadedShownBasis: BASIS }))
    expect(v.stale).toBe(true)
    expect(v.legacy).toBe(false)
  })
  it('the two messages are distinct and the legacy one does not ask for a reload', () => {
    expect(legacyMessage).not.toBe(staleMessage)
    expect(legacyMessage).toMatch(/Bản nháp cũ cần cập nhật/)
    expect(legacyMessage).toMatch(/Cập nhật bản nháp để tiếp tục duyệt/)
    expect(legacyMessage).not.toMatch(/tải lại/i)
    expect(staleMessage).toMatch(/tải lại/)
  })
  it('legacy with unsaved edits asks to save first (saving also resolves the old draft)', () => {
    expect(approvalView(legacy({ modified: true })).reason).toMatch(/chưa lưu/)
  })
  it('legacy still respects permission and busy', () => {
    expect(approvalView(legacy({ loadedShownBasis: BASIS, canApprove: false })).reason).toMatch(
      /Chỉ biên tập viên/,
    )
    expect(approvalView(legacy({ loadedShownBasis: BASIS, busy: true })).reason).toBe('Đang xử lý…')
  })
  it('4. data with markers ignores the legacy comparison entirely', () => {
    expect(approvalView(base({ loadedShownBasis: OTHER })).reason).toBeNull()
  })
  it('5. a failed update save changes nothing: the button stays locked', () => {
    // Before and after the failed save the inputs are identical (no marker arrived).
    const before = approvalView(legacy({ loadedShownBasis: undefined }))
    const after = approvalView(legacy({ loadedShownBasis: undefined }))
    expect(after).toEqual(before)
    expect(after.reason).not.toBeNull()
  })
})
