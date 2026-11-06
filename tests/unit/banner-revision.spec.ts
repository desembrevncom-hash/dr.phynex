import { describe, expect, it } from 'vitest'

import {
  bannersApprovedFor,
  mergeShared,
  readApprovals,
  sharedRevision,
} from '@/lib/banner-revision'

const rev = sharedRevision

describe('shared banner revision', () => {
  it('is stable for an unchanged configuration however the Admin re-sends it', () => {
    const stored = {
      forma: { visualType: 'fullBleed', desktopImage: 3, mobileImage: null, title: 'KO' },
    }
    const adminResend = {
      forma: {
        visualType: 'fullBleed',
        desktopImage: { id: 3, url: '/x.png' },
        mobileImage: '',
        imagePosition: 'focal',
      },
    }
    expect(rev(adminResend)).toBe(rev(stored))
    // Missing slots and empty selects fall back to the slot defaults, the same as columns' DEFAULTs.
    expect(rev(null)).toBe(
      rev({ brand: { visualType: 'brandOptics', ctaTarget: 'brand', theme: 'brand' } }),
    )
  })

  it('ignores localized text: only shared fields define the revision', () => {
    expect(rev({ balm: { title: 'A', tagline: 'B', imageAlt: 'C', localeDesktopImage: 9 } })).toBe(
      rev({}),
    )
  })

  it('changes for every shared field that affects display', () => {
    const base = rev({})
    for (const [field, value] of [
      ['visualType', 'fullBleed'],
      ['desktopImage', 1],
      ['mobileImage', 2],
      ['imagePosition', 'top'],
      ['textDisplay', 'imageHasText'],
      ['ctaTarget', 'contact'],
      ['theme', 'sheet'],
      ['textTone', 'light'],
    ] as const) {
      expect(rev({ luma: { [field]: value } }), field).not.toBe(base)
    }
  })

  it('merges a partial request over the previous version (absent = unchanged, null = cleared)', () => {
    const previous = {
      forma: { visualType: 'fullBleed', desktopImage: 3 },
      luma: { theme: 'sheet' },
    }
    expect(rev(mergeShared(previous, { forma: { title: 'only text' } }))).toBe(rev(previous))
    expect(rev(mergeShared(previous, undefined))).toBe(rev(previous))
    expect(rev(mergeShared(previous, { forma: { desktopImage: null } }))).not.toBe(rev(previous))
  })

  it('reads only well-formed server approvals', () => {
    const r = rev({})
    expect(readApprovals({ ko: r, en: 'nope', xx: r, vi: 5 })).toEqual({ ko: r })
    expect(readApprovals('x')).toEqual({})
    expect(readApprovals([r])).toEqual({})
  })

  it('a locale is approved only for the exact shared revision of the document', () => {
    const banners = { forma: { desktopImage: 3 } }
    const doc = { banners, bannerApprovals: { ko: rev(banners), en: rev({}) } }
    expect(bannersApprovedFor(doc, 'ko')).toBe(true)
    expect(bannersApprovedFor(doc, 'en')).toBe(false)
    expect(bannersApprovedFor(doc, 'vi')).toBe(false)
    expect(bannersApprovedFor(null, 'ko')).toBe(false)
  })
})
