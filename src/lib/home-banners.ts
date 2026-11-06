import type { HomePage, Media } from '@/payload-types'

import { bannerSlots, ctaTargets, type BannerSlotName, type CtaTarget } from '@/globals/homeBanners'

/**
 * Decides what each of the five home slides shows, from the Home Page global as the current
 * reader may see it (guest: published + approved for this locale; staff preview: latest draft).
 * Pure: no I/O, so the fallback rules are unit-tested.
 *
 * Text: a slot uses CMS text only when its title is filled in this locale; otherwise the site's
 * built-in text for that slot. There is never a fallback to another language (CMS fallback is off).
 * Visual: a banner image the editor chose but the reader may not see (unreleased media for a
 * guest arrives as a bare id, not a document) is never replaced by a product image; the slot
 * shows its neutral built-in visual instead.
 */

type Slot = HomePage['banners']['brand']
export type SlotCms = Partial<Slot> | null | undefined

export type ResolvedImage = { desktop: Media; mobile: Media | null; alt: string; position: string }
export type ResolvedVisual =
  | { kind: 'brandOptics' }
  | { kind: 'formula' }
  | ({ kind: 'packshot'; source: 'banner' | 'product' } & ResolvedImage)
  | ({ kind: 'fullBleed' } & ResolvedImage)

export type ResolvedText =
  | { source: 'default' }
  | { source: 'cms'; title: string; tagline: string; ctaLabel: string | null; ctaTarget: CtaTarget }

export type ResolvedSlot = {
  slot: BannerSlotName
  theme: Slot['theme']
  visual: ResolvedVisual
  text: ResolvedText
  tone: 'dark' | 'light'
  /** Full-frame image already carries the copy: keep it in the HTML for AT, show only the CTA. */
  copyHidden: boolean
}

const asMedia = (value: unknown): Media | null =>
  value && typeof value === 'object' && 'id' in value && typeof (value as Media).url === 'string'
    ? (value as Media)
    : null
const chosen = (value: unknown) => value !== null && value !== undefined && value !== ''
const clampPct = (n: unknown) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50

const presetPositions: Record<string, string> = {
  center: '50% 50%',
  top: '50% 0%',
  bottom: '50% 100%',
  left: '0% 50%',
  right: '100% 50%',
}
export function objectPosition(preset: unknown, media: Media): string {
  if (typeof preset === 'string' && preset in presetPositions) return presetPositions[preset]
  return `${clampPct(media.focalX)}% ${clampPct(media.focalY)}%`
}

/**
 * Copy of a slide whose text comes from the CMS. The CMS has no description field: the slot keeps its own built-in
 * description (brand paragraphs, or the product's description) so the layout and content stay as they are; only
 * title, tagline and CTA are replaced. Adding a CMS description field would need a schema + migration.
 */
export function cmsSlideCopy<D>(
  builtInDescription: D,
  text: Extract<ResolvedText, { source: 'cms' }>,
  locale: string,
  cta: { label: string; href: string },
) {
  return {
    title: text.title,
    titleLang: locale,
    name: text.title,
    headline: text.tagline,
    description: builtInDescription,
    cta,
  }
}

const defaults = Object.fromEntries(bannerSlots.map((s) => [s.name, s])) as Record<
  BannerSlotName,
  (typeof bannerSlots)[number]
>

export function resolveSlot(
  slot: BannerSlotName,
  cms: SlotCms,
  /** The product's own released image (existing behaviour) for unconfigured packshot slots. */
  productImage: Media | null = null,
): ResolvedSlot {
  const d = defaults[slot]
  const neutral: ResolvedVisual = slot === 'brand' ? { kind: 'brandOptics' } : { kind: 'formula' }
  const type = cms?.visualType ?? d.visual
  const copyHiddenWanted = type === 'fullBleed' && cms?.textDisplay === 'imageHasText'
  const altFor = (media: Media) =>
    copyHiddenWanted ? '' : cms?.imageAlt?.trim() || media.alt || ''

  let visual: ResolvedVisual = neutral
  if (type === 'packshot') {
    if (chosen(cms?.desktopImage)) {
      const desktop = asMedia(cms?.desktopImage)
      visual = desktop
        ? {
            kind: 'packshot',
            source: 'banner',
            desktop,
            mobile: asMedia(cms?.mobileImage),
            alt: altFor(desktop),
            position: '50% 50%',
          }
        : neutral
    } else if (productImage && slot !== 'brand') {
      visual = {
        kind: 'packshot',
        source: 'product',
        desktop: productImage,
        mobile: null,
        alt: '',
        position: '50% 50%',
      }
    }
  } else if (type === 'fullBleed') {
    const desktop = asMedia(cms?.localeDesktopImage) ?? asMedia(cms?.desktopImage)
    if (desktop) {
      visual = {
        kind: 'fullBleed',
        desktop,
        mobile: asMedia(cms?.localeMobileImage) ?? asMedia(cms?.mobileImage),
        alt: altFor(desktop),
        position: objectPosition(cms?.imagePosition, desktop),
      }
    }
  }

  const title = cms?.title?.trim()
  const text: ResolvedText = title
    ? {
        source: 'cms',
        title,
        tagline: cms?.tagline?.trim() ?? '',
        ctaLabel: cms?.ctaLabel?.trim() || null,
        ctaTarget: (cms?.ctaTarget && cms.ctaTarget in ctaTargets
          ? cms.ctaTarget
          : d.cta) as CtaTarget,
      }
    : { source: 'default' }

  return {
    slot,
    theme: cms?.theme ?? d.theme,
    visual,
    text,
    tone: visual.kind === 'fullBleed' && cms?.textTone === 'light' ? 'light' : 'dark',
    copyHidden: visual.kind === 'fullBleed' && copyHiddenWanted,
  }
}

/** Always exactly five slots, in slider order, whatever the CMS returns. */
export function resolveHomeBanners(
  home: Pick<HomePage, 'banners'> | null | undefined,
  productImages: Partial<Record<BannerSlotName, Media | null>> = {},
): ResolvedSlot[] {
  return bannerSlots.map((s) =>
    resolveSlot(s.name, home?.banners?.[s.name], productImages[s.name] ?? null),
  )
}

export const ctaPath = (target: CtaTarget) => ctaTargets[target]
