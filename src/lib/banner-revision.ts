import { createHash } from 'node:crypto'

import { bannerSlots, type BannerSlotName } from '@/globals/homeBanners'
import { locales, type Locale } from '@/i18n/locales'

/**
 * Revision of the SHARED (non-localized) banner configuration: every field that changes what a
 * visitor sees in any language. Approval of a locale is tied to this revision (see
 * hooks/guardHomeBannerApproval.ts), so changing an image, the visual type, a CTA target or a
 * colour invalidates the approval of every locale, not only the one being edited.
 *
 * Values are normalized so a full Admin form that re-sends unchanged values (populated media
 * objects vs ids, '' vs null, empty select vs its default) yields the same revision.
 */
export const sharedBannerFields = [
  'visualType',
  'desktopImage',
  'mobileImage',
  'imagePosition',
  'textDisplay',
  'ctaTarget',
  'theme',
  'textTone',
] as const
type SharedField = (typeof sharedBannerFields)[number]

const defaults = (slot: (typeof bannerSlots)[number]): Record<SharedField, unknown> => ({
  visualType: slot.visual,
  desktopImage: null,
  mobileImage: null,
  imagePosition: 'focal',
  textDisplay: 'overlay',
  ctaTarget: slot.cta,
  theme: slot.theme,
  textTone: 'dark',
})

const normalize = (value: unknown, fallback: unknown) => {
  if (value && typeof value === 'object' && 'id' in value) return (value as { id: unknown }).id
  if (value === undefined || value === null || value === '') return fallback
  return value
}

type Banners =
  | Partial<Record<BannerSlotName, Record<string, unknown> | null | undefined>>
  | null
  | undefined

/** Canonical shared configuration, always all five slots and all shared fields in fixed order. */
export function sharedSnapshot(banners: Banners) {
  return bannerSlots.map((slot) => {
    const d = defaults(slot)
    const values = banners?.[slot.name] ?? {}
    return [slot.name, sharedBannerFields.map((f) => [f, normalize(values?.[f], d[f])])] as const
  })
}

export const sharedRevision = (banners: Banners) =>
  createHash('sha256')
    .update(JSON.stringify(sharedSnapshot(banners)))
    .digest('hex')

/** Incoming (possibly partial) banner data applied over the previous version's shared values. */
export function mergeShared(previous: Banners, incoming: Banners): Banners {
  const out: Record<string, Record<string, unknown>> = {}
  for (const slot of bannerSlots) {
    const prev = previous?.[slot.name] ?? {}
    const next = incoming?.[slot.name]
    const merged: Record<string, unknown> = {}
    for (const f of sharedBannerFields) {
      merged[f] = next && typeof next === 'object' && f in next ? next[f] : prev?.[f]
    }
    out[slot.name] = merged
  }
  return out as Banners
}

export type BannerApprovals = Partial<Record<Locale, string>>

/** Server-written map: which shared revision each locale's approval covers. Anything else is dropped. */
export function readApprovals(value: unknown): BannerApprovals {
  const out: BannerApprovals = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const l of locales) {
    const rev = (value as Record<string, unknown>)[l]
    if (typeof rev === 'string' && /^[a-f0-9]{64}$/.test(rev)) out[l] = rev
  }
  return out
}

/** True only when this locale approved exactly the shared configuration of this document. */
export const bannersApprovedFor = (
  doc: { banners?: Banners; bannerApprovals?: unknown } | null | undefined,
  locale: Locale,
) => !!doc && readApprovals(doc.bannerApprovals)[locale] === sharedRevision(doc.banners)
