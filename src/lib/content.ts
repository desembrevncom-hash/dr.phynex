import 'server-only'

import config from '@payload-config'
import { cache } from 'react'
import { getPayload, type CollectionSlug, type GlobalSlug, type Where } from 'payload'

import { locales, type Locale } from '@/i18n/locales'
import type { Config } from '@/payload-types'

export const getPayloadClient = () => getPayload({ config })

type Collections = Config['collections']
type Globals = Config['globals']

/**
 * All public reads go through these helpers. They never pass a user and always set
 * `overrideAccess: false`, so the same server-side access rules as the public API apply
 * (published + approved for this locale only). No draft mode, no locale fallback.
 */
const publicArgs = (locale: Locale) =>
  ({ locale, fallbackLocale: false, overrideAccess: false, draft: false }) as const

export async function findPublic<S extends CollectionSlug>(
  collection: S,
  locale: Locale,
  options: { where?: Where; limit?: number; page?: number; sort?: string; depth?: number } = {},
) {
  const payload = await getPayloadClient()
  return payload.find({ collection, ...publicArgs(locale), depth: 1, limit: 24, ...options }) as Promise<{
    docs: Collections[S][]
    totalDocs: number
    totalPages: number
    page?: number
  }>
}

export const findPublicBySlug = cache(
  async <S extends CollectionSlug>(collection: S, slug: string, locale: Locale, depth = 2) => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection,
      ...publicArgs(locale),
      depth,
      limit: 1,
      where: { slug: { equals: slug } },
    })
    return (docs[0] as Collections[S] | undefined) ?? null
  },
)

/** Locales in which this document is published and approved (drives hreflang + switcher). */
export const approvedLocalesFor = cache(async (collection: CollectionSlug, slug: string) => {
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
})

/** Returns the global only if it is published and approved in this locale. */
export const findPublicGlobal = cache(async <S extends GlobalSlug>(slug: S, locale: Locale) => {
  const payload = await getPayloadClient()
  const doc = (await payload.findGlobal({ slug, ...publicArgs(locale), depth: 1 })) as
    | (Globals[S] & { translationStatus?: string; _status?: string })
    | null
  return doc && doc.translationStatus === 'approved' ? (doc as Globals[S]) : null
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
