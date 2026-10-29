import Link from 'next/link'

import { MediaImage } from '@/components/ui/MediaImage'
import type { Locale } from '@/i18n/locales'
import { keepBrandTogether } from '@/lib/text'
import { localizedPath } from '@/lib/seo'
import type { Product } from '@/payload-types'

export function ProductCard({ product, locale }: { product: Product; locale: Locale }) {
  const image = Array.isArray(product.images) ? product.images[0] : null
  return (
    <li className="group">
      <Link href={localizedPath(locale, `/products/${product.slug}`)} className="block rounded-lg">
        <div className="aspect-square overflow-hidden rounded-lg border border-line bg-surface-muted">
          <MediaImage media={image} className="h-full w-full object-contain" sizes="(min-width: 768px) 25vw, 50vw" />
        </div>
        <h3 className="mt-3 font-medium group-hover:underline">{keepBrandTogether(product.name)}</h3>
        {product.shortDescription ? (
          <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{product.shortDescription}</p>
        ) : null}
      </Link>
    </li>
  )
}

export function ProductGrid({ products, locale }: { products: Product[]; locale: Locale }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} locale={locale} />
      ))}
    </ul>
  )
}
