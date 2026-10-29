import Link from 'next/link'

import { Arrow } from '@/components/ui/Arrow'
import { MediaImage } from '@/components/ui/MediaImage'
import type { Locale } from '@/i18n/locales'
import { localizedPath } from '@/lib/seo'
import { keepBrandTogether } from '@/lib/text'
import type { Product } from '@/payload-types'

// Accent colours come from each product's packaging (DESIGN.md §2).
export const accentBar: Record<Product['accent'], string> = {
  navy: 'bg-navy',
  'rx-red': 'bg-red',
  'mx-cyan': 'bg-mx-cyan',
  'mx-pink': 'bg-mx-pink',
}
export const accentText: Record<Product['accent'], string> = {
  navy: 'text-navy',
  'rx-red': 'text-red',
  'mx-cyan': 'text-mx-cyan',
  'mx-pink': 'text-mx-pink',
}

export const firstImage = (product?: Product | null) =>
  Array.isArray(product?.images) ? product.images[0] : undefined

/** Product shot on a muted panel, accent rule, name, pack size. `dark` = MX charcoal band. */
export function ProductTile({
  product,
  locale,
  dark = false,
  label,
  className = '',
}: {
  product: Product
  locale: Locale
  dark?: boolean
  label: string
  className?: string
}) {
  return (
    <li className={className}>
      <Link
        href={localizedPath(locale, `/products/${product.slug}`)}
        className={`group block rounded-lg ${dark ? 'bg-mx-raised p-3 sm:p-4' : ''}`}
      >
        <div className="overflow-hidden rounded-md bg-surface-muted">
          <div className="flex aspect-[4/5] items-center justify-center p-8 transition-transform duration-300 ease-out group-hover:scale-[1.02] sm:p-12">
            <MediaImage
              media={firstImage(product)}
              alt=""
              sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
              className="blend-panel max-h-full w-auto object-contain"
            />
          </div>
        </div>
        <div className={dark ? 'px-1 pb-2 pt-5' : 'pt-5'}>
          <span aria-hidden="true" className={`block h-0.5 w-6 ${accentBar[product.accent]}`} />
          <h3 className={`mt-4 text-xl font-bold leading-snug lg:text-2xl ${dark ? 'text-white' : 'text-navy'}`}>
            {keepBrandTogether(product.name)}
          </h3>
          {product.volume ? (
            <p className={`mt-1 text-sm ${dark ? 'text-mx-muted' : 'text-ink-muted'}`}>{product.volume}</p>
          ) : null}
          <p className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${dark ? 'text-white' : 'text-navy'}`}>
            {label}
            <Arrow />
          </p>
        </div>
      </Link>
    </li>
  )
}
