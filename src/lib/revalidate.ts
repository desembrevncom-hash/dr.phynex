import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/**
 * One tag for every cached guest read (see lib/content.ts). Products embed ingredients, media
 * and lines, so any CMS change invalidates all public reads; the site is small enough for that.
 */
export const PUBLIC_CONTENT_TAG = 'cms-public'

export function revalidatePublicContent() {
  try {
    revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 })
  } catch {
    // Outside a Next.js request (scripts, migrations) there is no cache to clear here.
    // Cached reads also expire on their own (see GUEST_CACHE_SECONDS).
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidatePublicContent()
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidatePublicContent()
  return doc
}

export const revalidateGlobalAfterChange: GlobalAfterChangeHook = ({ doc }) => {
  revalidatePublicContent()
  return doc
}
