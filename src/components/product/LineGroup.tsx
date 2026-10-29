import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { Arrow } from '@/components/ui/Arrow'
import { Pending } from '@/components/ui/Pending'
import type { Locale } from '@/i18n/locales'
import { localizedPath } from '@/lib/seo'
import type { Product, ProductLine } from '@/payload-types'

import { accentText, ProductTile } from './ProductTile'

/**
 * One product line in the catalogue: RX on white, MX on the charcoal band (line `appearance`).
 * A plain catalogue grid, unlike the composed layout on the home page.
 */
export async function LineGroup({
  line,
  products,
  locale,
  showLineLink = true,
  showCount = true,
  headingLevel = 'h2',
}: {
  line: ProductLine
  products: Product[]
  locale: Locale
  showLineLink?: boolean
  /** Off when the page already states the total (a single filtered line). */
  showCount?: boolean
  /** h1 when the group is the whole page (line page), h2 inside the catalogue. */
  headingLevel?: 'h1' | 'h2'
}) {
  const Heading = headingLevel
  const t = await getTranslations()
  const dark = line.appearance === 'dark'
  const headingId = `group-${line.slug}`
  const code = dark ? 'text-white' : accentText[products[0]?.accent ?? 'navy']

  return (
    <section aria-labelledby={headingId} className={dark ? 'on-dark bg-mx-charcoal text-white' : 'bg-surface'}>
      <div className="container-page py-12 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="max-w-2xl">
            <Heading
              id={headingId}
              className={`font-bold tracking-tight ${headingLevel === 'h1' ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl lg:text-3xl'} ${dark ? 'text-white' : 'text-navy'}`}
            >
              {t.rich('home.lineHeading', {
                line: line.name,
                code: (chunks) => <span className={`font-extrabold ${code}`}>{chunks}</span>,
              })}
            </Heading>
            <div className={`mt-2 text-sm lg:text-base ${dark ? 'text-mx-muted' : 'text-ink-muted'}`}>
              {line.description ? <p>{line.description}</p> : <Pending label="lineDescription" values={{ line: line.name }} />}
            </div>
          </div>
          {showCount ? (
            <p className={`text-sm ${dark ? 'text-mx-muted' : 'text-ink-muted'}`}>{t('products.count', { count: products.length })}</p>
          ) : null}
        </div>
        <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductTile key={p.id} product={p} locale={locale} dark={dark} label={t('home.viewProduct')} />
          ))}
        </ul>
        {showLineLink ? (
          <p className="mt-8">
            <Link
              href={localizedPath(locale, `/products/line/${line.slug}`)}
              className={`group inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline ${dark ? 'text-white' : 'text-navy'}`}
            >
              {t('home.viewLine', { line: line.name })}
              <Arrow />
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  )
}
