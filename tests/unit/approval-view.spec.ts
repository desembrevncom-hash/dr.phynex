import { describe, expect, it } from 'vitest'

import type { ApprovalState } from '@/lib/approval-basis'
import { approvalView, type ApprovalViewInput } from '@/lib/approval-view'

const state = (docSave: string | null): ApprovalState => ({
  locale: 'vi',
  basis: 'a'.repeat(64),
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

describe('approval panel never pairs a newer basis with older form content', () => {
  it('allows approval when the basis belongs to the save the form shows', () => {
    expect(approvalView(base())).toEqual({ reason: null, stale: false })
  })
  it('after a save: a basis for a newer stored draft than the form shows is refused (stale)', () => {
    const v = approvalView(base({ state: state('save-2') }))
    expect(v.stale).toBe(true)
    expect(v.reason).toMatch(/không khớp bản đã lưu/)
  })
  it('a basis older than the shown save is refused too', () => {
    expect(approvalView(base({ shownSave: 'save-0' })).stale).toBe(true)
  })
  it('refuses when either timestamp is missing or unparsable', () => {
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
