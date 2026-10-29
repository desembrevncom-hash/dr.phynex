import Image from 'next/image'

import { populated } from '@/lib/content'
import { siteURL } from '@/lib/seo'
import type { Media } from '@/payload-types'

type Props = { media: unknown; className?: string; sizes?: string; priority?: boolean; alt?: string }

/** Payload returns absolute URLs; keep same-origin files relative so next/image treats them as local. */
export const mediaSrc = (url: string) => (url.startsWith(siteURL) ? url.slice(siteURL.length) : url)

export function MediaImage({ media, className, sizes = '(min-width: 768px) 50vw, 100vw', priority, alt }: Props) {
  const doc = populated<Media>(media)
  if (!doc?.url) return null
  const src = mediaSrc(doc.url)
  return (
    <Image
      src={src}
      alt={alt ?? doc.alt}
      width={doc.width ?? 1200}
      height={doc.height ?? 1200}
      sizes={sizes}
      priority={priority}
      // Unreleased files are only served to a signed-in staff browser (draft preview); the
      // image optimizer fetches without that session, so load them directly.
      unoptimized={!doc.publicRelease}
      className={className}
    />
  )
}
