import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { Arrow } from '@/components/ui/Arrow'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageIntro } from '@/components/ui/PageIntro'
import type { Locale } from '@/i18n/locales'
import { findPublic } from '@/lib/content'
import { pageLocale, type LocaleParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getTranslations({ locale, namespace: 'ingredients' })
  return { title: t('title'), alternates: alternatesFor(locale, '/ingredients') }
}

type Entry = { id: number; slug: string; name: string; summary?: string | null; inciName?: string | null }

async function EntryList({ id, title, entries, locale, kind = 'ingredients' }: { id: string; title: string; entries: Entry[]; locale: Locale; kind?: 'ingredients' | 'technologies' }) {
  const t = await getTranslations('ingredients')
  return (
    <section aria-labelledby={id} className="py-8 lg:py-10">
      <h2 id={id} className="text-2xl font-bold tracking-tight text-navy lg:text-3xl">
        {title}
      </h2>
      <ul className="mt-6 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <li key={e.id} className="border-t border-navy">
            <Link href={localizedPath(locale, `/${kind}/${e.slug}`)} className="group flex h-full flex-col gap-2 py-5">
              <span className="text-lg font-bold text-navy group-hover:underline">{e.name}</span>
              {e.inciName && e.inciName !== e.name ? (
                <span lang="en" className="text-sm text-ink-muted">
                  {t('inciName')}: {e.inciName}
                </span>
              ) : null}
              {/* Only the editor's own summary is shown; no descriptions are generated. */}
              {e.summary ? <span className="text-sm text-ink-muted">{e.summary}</span> : null}
              <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-medium text-navy">
                {t('view')}
                <Arrow />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function IngredientsPage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, ingredients, technologies] = await Promise.all([
    getTranslations(),
    findPublic('ingredients', locale, { limit: 200, depth: 0, sort: ['order', 'createdAt'] }),
    findPublic('technologies', locale, { limit: 200, depth: 0, sort: ['order', 'createdAt'] }),
  ])
  const empty = ingredients.docs.length === 0 && technologies.docs.length === 0

  return (
    <PageShell locale={locale} path="/ingredients" bleed>
      <PageIntro title={t('ingredients.title')} />
      <div className="container-page pb-10 lg:pb-14">
        {empty ? (
          <div className="pt-10">
            <EmptyState
              body={t('ingredients.empty')}
              links={[{ href: localizedPath(locale, '/products'), title: t('common.viewProducts'), body: t('common.productsBody') }]}
            />
          </div>
        ) : (
          <>
            {technologies.docs.length > 0 ? (
              <EntryList kind="technologies" id="technologies" title={t('ingredients.technologies')} entries={technologies.docs} locale={locale} />
            ) : null}
            {ingredients.docs.length > 0 ? (
              <EntryList id="ingredients" title={t('ingredients.ingredients')} entries={ingredients.docs} locale={locale} />
            ) : null}
          </>
        )}
      </div>
    </PageShell>
  )
}
