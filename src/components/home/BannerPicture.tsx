import { getImageProps } from 'next/image'

import { mediaSrc } from '@/components/ui/MediaImage'
import type { Media } from '@/payload-types'

type Props = {
  desktop: Media
  /** Below 768px; falls back to the desktop image. */
  mobile?: Media | null
  alt: string
  className?: string
  sizes: string
  /** CSS object-position from a preset or the Media focal point. */
  position?: string
}

const propsFor = (media: Media, alt: string, sizes: string) =>
  getImageProps({
    src: mediaSrc(media.url ?? ''),
    alt,
    width: media.width ?? 1600,
    height: media.height ?? 900,
    sizes,
    // Unreleased files only reach a signed-in staff preview; the optimizer fetches without
    // that session, so they load directly (same rule as MediaImage).
    unoptimized: !media.publicRelease,
  }).props

/** Only ever receives media the current reader is allowed to read (see lib/home-banners.ts). */
export function BannerPicture({ desktop, mobile, alt, className, sizes, position }: Props) {
  const main = propsFor(desktop, alt, sizes)
  const small = mobile && mobile.id !== desktop.id ? propsFor(mobile, alt, sizes) : null
  const { srcSet: desktopSet, ...img } = main
  return (
    <picture>
      {small ? <source media="(max-width: 767px)" srcSet={small.srcSet ?? small.src} /> : null}
      <source media="(min-width: 768px)" srcSet={desktopSet ?? img.src} />
      <img
        {...img}
        alt={alt}
        srcSet={desktopSet}
        className={className}
        style={position ? { objectPosition: position } : undefined}
      />
    </picture>
  )
}
