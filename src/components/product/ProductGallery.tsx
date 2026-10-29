'use client'

import Image from 'next/image'
import { useState } from 'react'

export type GalleryImage = { src: string; alt: string; width: number; height: number; unoptimized: boolean }

/** Main product shot plus thumbnails (only when there is more than one image). */
export function ProductGallery({ images, label, thumbLabel }: { images: GalleryImage[]; label: string; thumbLabel: string }) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]
  if (!current) return null

  return (
    <div role="group" aria-label={label}>
      {/* Height is capped below 1024px so the name, pack size and contact buttons stay close;
          object-contain keeps the whole pack visible at its own proportions. */}
      <div className="flex h-[clamp(300px,56vh,440px)] items-center justify-center rounded-lg bg-surface-muted p-6 sm:p-8 md:h-[460px] lg:aspect-[4/5] lg:h-auto lg:p-16">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          width={current.width}
          height={current.height}
          unoptimized={current.unoptimized}
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="hero-enter blend-panel h-full max-h-full w-auto object-contain"
        />
      </div>
      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image, i) => (
            <li key={image.src}>
              <button
                type="button"
                aria-pressed={i === active}
                aria-label={`${thumbLabel} ${i + 1}`}
                onClick={() => setActive(i)}
                className="flex aspect-square w-full items-center justify-center rounded-md border border-transparent bg-surface-muted p-2 transition-colors hover:border-line-strong aria-pressed:border-navy"
              >
                <Image
                  src={image.src}
                  alt=""
                  width={image.width}
                  height={image.height}
                  unoptimized={image.unoptimized}
                  sizes="120px"
                  className="blend-panel max-h-full w-auto object-contain"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
