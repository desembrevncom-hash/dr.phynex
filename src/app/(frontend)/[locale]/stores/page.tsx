import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { Arrow } from '@/components/ui/Arrow'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { PageIntro } from '@/components/ui/PageIntro'
import { Pending } from '@/components/ui/Pending'
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
    getTranslations(),
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
    <PageShell locale={locale} path="/stores" search={country && countries.includes(country) ? `?country=${country}` : ''} bleed>
      <PageIntro title={t('stores.title')} />

      {stores.docs.length === 0 ? (
        // No store is shown until an editor publishes one; nothing here is placeholder data.
        <div className="container-page py-10 lg:py-14">
          <div role="status" className="grid gap-8 rounded-lg bg-surface-muted p-6 sm:p-10 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-6">
              <h2 className="text-xl font-bold text-navy lg:text-2xl">{t('stores.emptyTitle')}</h2>
              <p className="mt-3 text-ink-muted">{t('stores.emptyBody')}</p>
              <Pending label="stores" className="mt-4 text-ink-muted" />
            </div>
            <ul className="border-t border-navy md:col-span-6">
              {(
                [
                  ['/contact', t('stores.askContact'), t('home.contactBody')],
                  ['/partnership', t('stores.becomePartner'), t('partnership.forWho')],
                ] as const
              ).map(([path, title, body]) => (
                <li key={path} className="border-b border-line">
                  <Link href={localizedPath(locale, path)} className="group flex items-start justify-between gap-4 py-5">
                    <span>
                      <span className="block font-semibold text-navy">{title}</span>
                      <span className="mt-1 block text-sm text-ink-muted">{body}</span>
                    </span>
                    <span className="mt-1 text-navy">
                      <Arrow />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="container-page pb-14 pt-6">
          {countries.length > 1 ? (
            <FilterTabs
              label={t('stores.country')}
              options={[
                { href: base, label: t('stores.allCountries'), active: !country },
                ...countries.map((c) => ({ href: `${base}?country=${c}`, label: countryName(c), active: c === country })),
              ]}
            />
          ) : null}
          <ul className="mt-8 grid gap-x-8 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((s) => {
              const website = safeHttpUrl(s.url)
              return (
                <li key={s.id} className="border-t border-navy py-6">
                  <p className="text-sm text-ink-muted">
                    {t(`stores.type.${s.type}`)} · {[s.city, countryName(s.country.toUpperCase())].filter(Boolean).join(', ')}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-navy">{s.name}</h2>
                  {s.address ? <p className="mt-2 whitespace-pre-line text-sm text-ink">{s.address}</p> : null}
                  <dl className="mt-3 space-y-1 text-sm">
                    {s.hours ? (
                      <div>
                        <dt className="inline text-ink-muted">{t('stores.hours')}: </dt>
                        <dd className="inline whitespace-pre-line text-ink">{s.hours}</dd>
                      </div>
                    ) : null}
                    {s.phone ? (
                      <div>
                        <dt className="inline text-ink-muted">{t('stores.phone')}: </dt>
                        <dd className="inline">
                          <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} className="text-navy underline underline-offset-2">
                            {s.phone}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                    {website ? (
                      <div>
                        <dt className="inline text-ink-muted">{t('stores.website')}: </dt>
                        <dd className="inline">
                          <a href={website} rel="noopener noreferrer" target="_blank" className="text-navy underline underline-offset-2">
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
        </div>
      )}
    </PageShell>
  )
}
