import 'server-only'

import { cache } from 'react'
import type { CollectionSlug, GlobalSlug, Where } from 'payload'

import { locales, type Locale } from '@/i18n/locales'
import type { Config, User } from '@/payload-types'

import { getPayloadClient } from './content-client'
import { getPreviewUser } from './preview'

export { getPayloadClient }

type Collections = Config['collections']
type Globals = Config['globals']

/**
 * All site reads go through these helpers and always set `overrideAccess: false`, so the
 * same server-side access rules as the public API apply. Guests get published + approved
 * content for this locale only. A staff member in draft preview (see lib/preview.ts) reads
 * the latest drafts *as themselves*, so access is still decided by their role. No fallback.
 */
const readArgs = (locale: Locale, user: User | null) =>
  user
    ? ({ locale, fallbackLocale: false, overrideAccess: false, draft: true, user } as const)
    : ({ locale, fallbackLocale: false, overrideAccess: false, draft: false } as const)

/** Public reads deliberately bypass persistent caches. React cache deduplicates only
 * within one render. Revocation is checked against committed CMS state on each request. */
type FindOptions = { where?: Where; limit?: number; page?: number; sort?: string | string[]; depth?: number }
type FindResult<S extends CollectionSlug> = { docs: Collections[S][]; totalDocs: number; totalPages: number; page?: number }

const find = async (collection: CollectionSlug, locale: Locale, user: User | null, options: FindOptions) => {
  const payload = await getPayloadClient()
  return payload.find({ collection, ...readArgs(locale, user), depth: 1, limit: 24, ...options })
}
const guestFind = (collection: CollectionSlug, locale: Locale, options: FindOptions) =>
  find(collection, locale, null, options)

export async function findPublic<S extends CollectionSlug>(
  collection: S,
  locale: Locale,
  { publicOnly = false, ...options }: FindOptions & { publicOnly?: boolean } = {},
) {
  const user = publicOnly ? null : await getPreviewUser()
  return (await (user ? find(collection, locale, user, options) : guestFind(collection, locale, options))) as unknown as FindResult<S>
}

export const findPublicBySlug = cache(
  async <S extends CollectionSlug>(collection: S, slug: string, locale: Locale, depth = 2) => {
    const { docs } = await findPublic(collection, locale, { depth, limit: 1, where: { slug: { equals: slug } } })
    return docs[0] ?? null
  },
)

/** Locales in which this document is published and approved (drives hreflang + switcher). */
const guestApprovedLocales = async (collection: CollectionSlug, slug: string) => {
  const payload = await getPayloadClient()
  const results = await Promise.all(
    locales.map(async (locale) => {
      const { totalDocs } = await payload.count({
        collection,
        locale,
        overrideAccess: false,
        where: { slug: { equals: slug } },
      })
      return totalDocs > 0 ? locale : null
    }),
  )
  return results.filter((l): l is Locale => l !== null)
}

export const approvedLocalesFor = cache(async (collection: CollectionSlug, slug: string) => {
  if (await getPreviewUser()) return [...locales]
  return guestApprovedLocales(collection, slug)
})

/** Returns the global only if it is published and approved in this locale (any draft in preview). */
const findGlobal = async (slug: GlobalSlug, locale: Locale, user: User | null) => {
  const payload = await getPayloadClient()
  const doc = (await payload.findGlobal({ slug, ...readArgs(locale, user), depth: 1 })) as unknown as
    | ({ translationStatus?: string; _status?: string } & Record<string, unknown>)
    | null
  if (!doc) return null
  return user || doc.translationStatus === 'approved' ? doc : null
}
const guestGlobal = (slug: GlobalSlug, locale: Locale) => findGlobal(slug, locale, null)

/** Guest view of a global regardless of any preview session (sitemap, feeds). */
export const findGuestGlobal = <S extends GlobalSlug>(slug: S, locale: Locale) =>
  guestGlobal(slug, locale) as Promise<Globals[S] | null>

export const findPublicGlobal = cache(async <S extends GlobalSlug>(slug: S, locale: Locale) => {
  const user = await getPreviewUser()
  return (await (user ? findGlobal(slug, locale, user) : guestGlobal(slug, locale))) as Globals[S] | null
})

export const approvedGlobalLocales = cache(async (slug: GlobalSlug) => {
  const results = await Promise.all(
    locales.map(async (locale) => ((await findPublicGlobal(slug, locale)) ? locale : null)),
  )
  return results.filter((l): l is Locale => l !== null)
})

/** Narrow a Payload relationship value (id or populated doc) to the populated doc. */
export const populated = <T extends { id: number | string }>(value: unknown): T | null =>
  value && typeof value === 'object' && 'id' in value ? (value as T) : null

export const populatedList = <T extends { id: number | string }>(values: unknown): T[] =>
  Array.isArray(values) ? values.map((v) => populated<T>(v)).filter((v): v is T => v !== null) : []
