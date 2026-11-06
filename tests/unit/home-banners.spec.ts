import { describe, expect, it } from 'vitest'

import { cmsSlideCopy, objectPosition, resolveHomeBanners, resolveSlot } from '@/lib/home-banners'
import type { Media } from '@/payload-types'

const media = (id: number, over: Partial<Media> = {}): Media =>
  ({
    id,
    alt: `Media alt ${id}`,
    url: `/api/media/file/m${id}.png`,
    filename: `m${id}.png`,
    width: 1600,
    height: 900,
    publicRelease: true,
    updatedAt: '',
    createdAt: '',
    ...over,
  }) as Media

describe('home banners: fallback rules', () => {
  it('no Home Page for this reader (not approved in this locale) keeps all five built-in slides', () => {
    const slots = resolveHomeBanners(null)
    expect(slots.map((s) => s.slot)).toEqual(['brand', 'forma', 'luma', 'balm', 'sheet'])
    expect(slots.every((s) => s.text.source === 'default')).toBe(true)
    expect(slots.map((s) => s.visual.kind)).toEqual([
      'brandOptics',
      'formula',
      'formula',
      'formula',
      'formula',
    ])
    expect(slots.map((s) => s.theme)).toEqual(['brand', 'forma', 'luma', 'balm', 'sheet'])
  })

  it('unconfigured packshot slots keep the existing product-image behaviour', () => {
    const slots = resolveHomeBanners(null, { luma: media(7) })
    expect(slots[2].visual).toMatchObject({ kind: 'packshot', source: 'product' })
    expect(slots[0].visual.kind).toBe('brandOptics')
  })

  it('a chosen banner image the reader cannot see (bare id) is never replaced by the product image', () => {
    const slot = resolveSlot('forma', { visualType: 'packshot', desktopImage: 42 }, media(7))
    expect(slot.visual.kind).toBe('formula')
    const full = resolveSlot('forma', { visualType: 'fullBleed', desktopImage: 42 }, media(7))
    expect(full.visual.kind).toBe('formula')
    expect(full.copyHidden).toBe(false)
    const brand = resolveSlot('brand', { visualType: 'fullBleed', desktopImage: 42 })
    expect(brand.visual.kind).toBe('brandOptics')
  })

  it('CMS text is used only when the title is filled in this locale', () => {
    expect(resolveSlot('balm', { title: '  ', tagline: 'x' }).text.source).toBe('default')
    const t = resolveSlot('balm', {
      title: ' Balm ',
      tagline: ' Line ',
      ctaLabel: ' ',
      ctaTarget: 'contact',
    })
    expect(t.text).toEqual({
      source: 'cms',
      title: 'Balm',
      tagline: 'Line',
      ctaLabel: null,
      ctaTarget: 'contact',
    })
  })

  it('an unknown CTA target falls back to the slot default destination', () => {
    const t = resolveSlot('sheet', { title: 'T', ctaTarget: 'https://evil.example' as never })
    expect(t.text.source === 'cms' && t.text.ctaTarget).toBe('rx-matrix-sheet')
  })

  it('mobile image falls back to the desktop image; per-locale image wins over the shared one', () => {
    const shared = resolveSlot('forma', { visualType: 'fullBleed', desktopImage: media(1) })
    expect(shared.visual.kind === 'fullBleed' && shared.visual.mobile).toBeNull()
    const local = resolveSlot('forma', {
      visualType: 'fullBleed',
      desktopImage: media(1),
      mobileImage: media(2),
      localeDesktopImage: media(3),
      localeMobileImage: media(4),
    })
    expect(
      local.visual.kind === 'fullBleed' && [local.visual.desktop.id, local.visual.mobile?.id],
    ).toEqual([3, 4])
    // Locale image not readable by this reader → the shared image, never a product image.
    const fallback = resolveSlot('forma', {
      visualType: 'fullBleed',
      desktopImage: media(1),
      localeDesktopImage: 9,
    })
    expect(fallback.visual.kind === 'fullBleed' && fallback.visual.desktop.id).toBe(1)
  })

  it('full-frame image with built-in copy: decorative alt, copy kept for screen readers, CTA visible', () => {
    const s = resolveSlot('luma', {
      visualType: 'fullBleed',
      desktopImage: media(1),
      textDisplay: 'imageHasText',
      imageAlt: 'Should not be read twice',
      title: 'Luma',
    })
    expect(s.copyHidden).toBe(true)
    expect(s.visual.kind === 'fullBleed' && s.visual.alt).toBe('')
    const overlay = resolveSlot('luma', {
      visualType: 'fullBleed',
      desktopImage: media(1),
      imageAlt: ' Campaign ',
    })
    expect(overlay.copyHidden).toBe(false)
    expect(overlay.visual.kind === 'fullBleed' && overlay.visual.alt).toBe('Campaign')
    const mediaAlt = resolveSlot('luma', { visualType: 'fullBleed', desktopImage: media(1) })
    expect(mediaAlt.visual.kind === 'fullBleed' && mediaAlt.visual.alt).toBe('Media alt 1')
  })

  it('light text only applies on a full-frame image', () => {
    expect(
      resolveSlot('forma', { visualType: 'fullBleed', desktopImage: media(1), textTone: 'light' })
        .tone,
    ).toBe('light')
    expect(
      resolveSlot('forma', { visualType: 'packshot', desktopImage: media(1), textTone: 'light' })
        .tone,
    ).toBe('dark')
    expect(
      resolveSlot('forma', { visualType: 'fullBleed', desktopImage: 5, textTone: 'light' }).tone,
    ).toBe('dark')
  })

  it('image position comes from presets or the clamped Media focal point only', () => {
    expect(objectPosition('top', media(1))).toBe('50% 0%')
    expect(objectPosition('focal', media(1, { focalX: 20, focalY: 80 }))).toBe('20% 80%')
    expect(objectPosition('focal', media(1, { focalX: 250, focalY: -3 }))).toBe('100% 0%')
    expect(objectPosition('0 0; color:red', media(1))).toBe('50% 50%')
  })
})

describe('home banners: CMS text without a description (regression)', () => {
  // The CMS has title, tagline and CTA label, but no description field. The slide must keep the slot's built-in
  // description instead of losing it (the earlier version set it to null, so the paragraph disappeared in preview).
  const cms = { title: 'MX-01 FORMA', tagline: 'Focused moisture.', ctaLabel: 'Discover MX-01' }
  const builtIn = { paragraphs: ['Built-in description of this slot'] }

  it('uses the CMS title, tagline and CTA, and keeps the built-in description (same object, not a copy or null)', () => {
    const r = resolveSlot('forma', cms)
    expect(r.text.source).toBe('cms')
    if (r.text.source !== 'cms') throw new Error('unreachable')
    const out = cmsSlideCopy(builtIn, r.text, 'en', {
      label: 'Discover MX-01',
      href: '/en/products/mx-01-forma',
    })
    expect(out.description).toBe(builtIn)
    expect(out).toMatchObject({
      title: 'MX-01 FORMA',
      name: 'MX-01 FORMA',
      titleLang: 'en',
      headline: 'Focused moisture.',
      cta: { label: 'Discover MX-01', href: '/en/products/mx-01-forma' },
    })
  })

  it('holds for all five slots and does not touch who may see the slide (default text is still default)', () => {
    for (const slot of ['brand', 'forma', 'luma', 'balm', 'sheet'] as const) {
      const r = resolveSlot(slot, { ...cms, title: `T ${slot}` })
      if (r.text.source !== 'cms') throw new Error('expected CMS text')
      expect(cmsSlideCopy(slot, r.text, 'vi', { label: 'x', href: '/vi' }).description).toBe(slot)
      expect(resolveSlot(slot, { tagline: 'only a tagline' }).text.source).toBe('default')
    }
  })
})
