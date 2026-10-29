import Image from 'next/image'

import { populated } from '@/lib/content'
import type { Media } from '@/payload-types'

type Props = { media: unknown; className?: string; sizes?: string; priority?: boolean }

export function MediaImage({ media, className, sizes = '(min-width: 768px) 50vw, 100vw', priority }: Props) {
  const doc = populated<Media>(media)
  if (!doc?.url) return null
  return (
    <Image
      src={doc.url}
      alt={doc.alt}
      width={doc.width ?? 1200}
      height={doc.height ?? 1200}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  )
}
