import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterLinks } from '@/components/ui/LinkList'
import { PageHeading } from '@/components/ui/PageHeading'
import { findPublic } from '@/lib/content'
import { firstParam, pageLocale, type LocaleParams, type SearchParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getTranslations({ locale, namespace: 'stores' })
  return { title: t('title'), alternates: alternatesFor(locale, '/stores') }
}

const safeHttpUrl = (value?: string | null) => {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export default async function StoresPage({ params, searchParams }: { params: LocaleParams; searchParams: SearchParams }) {
  const locale = await pageLocale(params)
  const country = firstParam((await searchParams).country)?.toUpperCase()
  const [t, stores] = await Promise.all([
    getTranslations('stores'),
    findPublic('stores', locale, { limit: 500, depth: 0, sort: 'order' }),
  ])

  const regionNames = new Intl.DisplayNames([locale], { type: 'region' })
  const countryName = (code: string) => {
    try {
      return regionNames.of(code) ?? code
    } catch {
      return code
    }
  }
  const countries = [...new Set(stores.docs.map((s) => s.country.toUpperCase()))].sort()
  const visible = country ? stores.docs.filter((s) => s.country.toUpperCase() === country) : stores.docs
  const base = localizedPath(locale, '/stores')

  return (
    <PageShell locale={locale} path="/stores">
      <PageHeading>{t('title')}</PageHeading>
      {stores.docs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {countries.length > 1 ? (
            <div className="mb-8">
              <FilterLinks
                label={t('country')}
                options={[
                  { href: base, label: t('allCountries'), active: !country },
                  ...countries.map((c) => ({ href: `${base}?country=${c}`, label: countryName(c), active: c === country })),
                ]}
              />
            </div>
          ) : null}
          <ul className="grid gap-4 md:grid-cols-2">
            {visible.map((s) => {
              const website = safeHttpUrl(s.url)
              return (
                <li key={s.id} className="rounded-lg border border-line p-5">
                  <p className="text-xs uppercase tracking-wide text-ink-muted">
                    {t(`type.${s.type}`)} · {[s.city, countryName(s.country.toUpperCase())].filter(Boolean).join(', ')}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{s.name}</h2>
                  {s.address ? <p className="mt-2 whitespace-pre-line text-ink-muted">{s.address}</p> : null}
                  <dl className="mt-3 space-y-1 text-sm">
                    {s.hours ? (
                      <div>
                        <dt className="inline font-medium">{t('hours')}: </dt>
                        <dd className="inline whitespace-pre-line">{s.hours}</dd>
                      </div>
                    ) : null}
                    {s.phone ? (
                      <div>
                        <dt className="inline font-medium">{t('phone')}: </dt>
                        <dd className="inline">
                          <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} className="underline underline-offset-2">
                            {s.phone}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                    {website ? (
                      <div>
                        <dt className="inline font-medium">{t('website')}: </dt>
                        <dd className="inline">
                          <a href={website} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2">
                            {new URL(website).host}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </PageShell>
  )
}
