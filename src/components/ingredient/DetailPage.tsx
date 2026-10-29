import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { ProductTile } from '@/components/product/ProductTile'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { MediaImage } from '@/components/ui/MediaImage'
import { Pending } from '@/components/ui/Pending'
import { RichText } from '@/components/ui/RichText'
import type { Locale } from '@/i18n/locales'
import { approvedLocalesFor, findPublic, findPublicBySlug } from '@/lib/content'
import { pageLocale, type SlugParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'
import { hasRichText } from '@/lib/text'

type Kind = 'ingredients' | 'technologies'
async function resolve(kind: Kind, slug: string, locale: Locale) {
 const doc = await findPublicBySlug(kind, slug, locale, 1)
 return doc ? { kind, doc } : null
}

export async function detailMetadata(kind: Kind, params: SlugParams): Promise<Metadata> {
  const locale = await pageLocale(params)
  const { slug } = await params
  const found = await resolve(kind, slug, locale)
  if (!found) return {}
  return {
    title: found.doc.seo?.title || found.doc.name,
    description: found.doc.seo?.description || found.doc.summary || undefined,
    alternates: alternatesFor(locale, `/${kind}/${slug}`, await approvedLocalesFor(found.kind, slug)),
  }
}

export async function IngredientDetail({ kind, params }: { kind: Kind; params: SlugParams }) {
  const locale = await pageLocale(params)
  const { slug } = await params
  const found = await resolve(kind, slug, locale)
  if (!found) notFound()
  const { doc } = found

  const field = kind === 'ingredients' ? 'keyIngredients' : 'technologies'
  const [t, available, products] = await Promise.all([
    getTranslations(),
    approvedLocalesFor(kind, slug),
    // Only products visible to this viewer (published + approved for guests) are listed.
    findPublic('products', locale, { where: { [field]: { contains: doc.id } }, limit: 24, sort: 'createdAt' }),
  ])
  const described = Boolean(doc.summary || hasRichText(doc.body))

  return (
    <PageShell locale={locale} path={`/${kind}/${slug}`} available={available} bleed>
      <Breadcrumb items={[{ href: localizedPath(locale, '/ingredients'), label: t('ingredients.title') }, { label: doc.name }]} />
      <article className="container-page pb-10 pt-6 lg:pb-14 lg:pt-8">
        <header className="grid gap-4 border-t border-navy pt-6 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-navy sm:text-4xl lg:text-5xl">{doc.name}</h1>
            {'inciName' in doc && doc.inciName ? (
              <p className="mt-3 text-sm text-ink-muted">
                {t('ingredients.inciName')}: <span lang="en">{doc.inciName}</span>
              </p>
            ) : null}
          </div>
          {doc.summary ? <p className="text-base text-ink-muted md:col-span-5 md:pt-2 lg:text-lg">{doc.summary}</p> : null}
        </header>

        <div className="mt-8 grid gap-8 md:grid-cols-12">
          <div className="md:col-span-7">
            {hasRichText(doc.body) ? <RichText data={doc.body} className="text-ink" /> : null}
            {/* No description is generated: only an editor-supplied, sourced text may appear here. */}
            {described ? null : <Pending label="ingredientDescription" className="text-ink-muted" />}
          </div>
          {doc.image ? (
            <div className="md:col-span-5">
              <MediaImage media={doc.image} className="w-full rounded-lg" />
            </div>
          ) : null}
        </div>
      </article>

      {products.docs.length > 0 ? (
        <section aria-labelledby="products-containing" className="bg-surface">
          <div className="container-page pb-14">
            <h2 id="products-containing" className="border-t border-navy pt-6 text-2xl font-bold tracking-tight text-navy">
              {t('ingredients.productsContaining')}
            </h2>
            <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {products.docs.map((p) => (
                <ProductTile key={p.id} product={p} locale={locale} label={t('home.viewProduct')} />
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </PageShell>
  )
}
