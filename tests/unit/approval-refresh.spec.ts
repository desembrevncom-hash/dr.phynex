import { describe, expect, it } from 'vitest'

import type { ApprovalState } from '@/lib/approval-basis'
import {
  ApprovalRefresher,
  buildApprovalRequest,
  selectApprovalState,
} from '@/lib/approval-refresh'

const state = (locale: 'ko' | 'en' | 'vi', basis = locale[0].repeat(64)): ApprovalState => ({
  locale,
  basis,
  revision: 'r'.repeat(64),
  approved: { ko: false, en: false, vi: false },
  status: 'in-review',
  docSave: `save-${locale}`,
})

const pick = (r: ApprovalRefresher, locale: string, loaded?: ApprovalState) =>
  selectApprovalState({ locale, loaded, refresher: r })

describe('approval panel refresh: results are tied to a locale and a request generation', () => {
  it('KO → EN, the KO response arrives after EN: it is ignored and EN stays', () => {
    const r = new ApprovalRefresher()
    const ko = r.begin('ko')
    const en = r.begin('en') // user switched to English while KO was still loading
    expect(r.finish(en.generation, 'en', state('en'))).toBe(true)
    expect(pick(r, 'en')).toEqual(state('en'))
    expect(r.finish(ko.generation, 'ko', state('ko'))).toBe(false) // late KO answer
    expect(pick(r, 'en')).toEqual(state('en'))
    expect(r.pending).toBe(false)
  })

  it('KO → EN, the KO response arrives first: it cannot end the waiting state of EN', () => {
    const r = new ApprovalRefresher()
    const ko = r.begin('ko')
    const en = r.begin('en')
    expect(r.finish(ko.generation, 'ko', state('ko'))).toBe(false)
    expect(r.pending).toBe(true) // EN is still being read
    expect(pick(r, 'en')).toBeUndefined() // approval stays locked
    expect(r.finish(en.generation, 'en', state('en'))).toBe(true)
    expect(pick(r, 'en')).toEqual(state('en'))
  })

  it('KO → EN → KO with the responses in reverse order: only the last KO request counts', () => {
    const r = new ApprovalRefresher()
    const ko1 = r.begin('ko')
    const en = r.begin('en')
    const ko2 = r.begin('ko')
    expect(r.finish(en.generation, 'en', state('en'))).toBe(false)
    expect(r.finish(ko1.generation, 'ko', state('ko', 'o'.repeat(64)))).toBe(false) // older KO answer
    expect(r.pending).toBe(true)
    expect(pick(r, 'ko')).toBeUndefined()
    expect(r.finish(ko2.generation, 'ko', state('ko', 'n'.repeat(64)))).toBe(true)
    expect(pick(r, 'ko')?.basis).toBe('n'.repeat(64))
  })

  it('starting a new request aborts the previous one', () => {
    const r = new ApprovalRefresher()
    const first = r.begin('ko')
    const second = r.begin('en')
    expect(first.signal.aborted).toBe(true)
    expect(second.signal.aborted).toBe(false)
  })

  it('a state that names another locale is never used, even from the latest request', () => {
    const r = new ApprovalRefresher()
    const en = r.begin('en')
    expect(r.finish(en.generation, 'en', state('ko'))).toBe(true) // server answered with KO data
    expect(pick(r, 'en')).toBeUndefined()
  })

  it('a failed refresh disables approval; reading again recovers', () => {
    const r = new ApprovalRefresher()
    const loaded = state('vi')
    expect(pick(r, 'vi', loaded)).toEqual(loaded) // before any refresh the loaded state is used
    const failed = r.begin('vi')
    expect(pick(r, 'vi', loaded)).toBeUndefined() // waiting: the old loaded state is NOT used
    expect(r.finish(failed.generation, 'vi', undefined)).toBe(true)
    expect(r.pending).toBe(false)
    expect(pick(r, 'vi', loaded)).toBeUndefined() // error: still no button from old data
    const retry = r.begin('vi')
    expect(r.finish(retry.generation, 'vi', state('vi', 'f'.repeat(64)))).toBe(true)
    expect(pick(r, 'vi', loaded)?.basis).toBe('f'.repeat(64))
  })

  it('the state the document was loaded with is only used for its own locale', () => {
    const r = new ApprovalRefresher()
    expect(pick(r, 'en', state('ko'))).toBeUndefined()
    expect(pick(r, 'ko', state('ko'))).toEqual(state('ko'))
  })

  it('cancel (unmount) drops every pending answer', () => {
    const r = new ApprovalRefresher()
    const a = r.begin('ko')
    r.cancel()
    expect(r.finish(a.generation, 'ko', state('ko'))).toBe(false)
    expect(r.pending).toBe(false)
  })
})

describe('approval request: label, URL and basis belong to the locale being edited', () => {
  it('uses the state of exactly that locale', () => {
    const en = buildApprovalRequest(state('en', 'e'.repeat(64)), 'en', 'tiếng Anh')
    expect(en?.label).toBe('Duyệt cấu hình cho tiếng Anh')
    expect(en?.url).toContain('locale=en')
    expect(en?.headers['x-approval-basis']).toBe('e'.repeat(64))
    const ko = buildApprovalRequest(state('ko', 'k'.repeat(64)), 'ko', 'tiếng Hàn')
    expect(ko?.label).toBe('Duyệt cấu hình cho tiếng Hàn')
    expect(ko?.url).toContain('locale=ko')
    expect(ko?.headers['x-approval-basis']).toBe('k'.repeat(64))
  })
  it('refuses to build a request from a state of another locale or no state', () => {
    expect(buildApprovalRequest(state('ko'), 'en', 'tiếng Anh')).toBeNull()
    expect(buildApprovalRequest(undefined, 'en', 'tiếng Anh')).toBeNull()
  })
  it('only ever asks for approval, nothing else', () => {
    const req = buildApprovalRequest(state('vi'), 'vi', 'tiếng Việt')!
    expect(JSON.parse(req.body)).toEqual({ translationStatus: 'approved' })
    expect(req.url).toContain('draft=true')
    expect(req.url).not.toContain('publish')
  })
})
