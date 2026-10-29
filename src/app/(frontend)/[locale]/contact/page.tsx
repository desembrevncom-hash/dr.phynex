import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { ContactForm } from '@/components/forms/ContactForm'
import { PageShell } from '@/components/layout/PageShell'
import { Arrow } from '@/components/ui/Arrow'
import { PageIntro } from '@/components/ui/PageIntro'
import { Pending } from '@/components/ui/Pending'
import { findPublicGlobal } from '@/lib/content'
import { getPreviewUser } from '@/lib/preview'
import { pageLocale, type LocaleParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getTranslations({ locale, namespace: 'contact' })
  return { title: t('title'), alternates: alternatesFor(locale, '/contact') }
}

export default async function ContactPage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, settings, preview] = await Promise.all([
    getTranslations(),
    findPublicGlobal('site-settings', locale),
    getPreviewUser(),
  ])
  // Contact details come only from Site settings once published + approved; nothing is hard-coded.
  const contact = settings?.contact
  const hasDetails = Boolean(contact && (contact.email || contact.phone || contact.address || contact.hours))
  const rows = [
    ['email', contact?.email],
    ['phone', contact?.phone],
    ['address', contact?.address],
    ['hours', contact?.hours],
  ] as const

  return (
    <PageShell locale={locale} path="/contact" bleed>
      <PageIntro title={t('contact.title')} lead={<p>{t('contact.lead')}</p>} />

      <div className="container-page grid gap-10 py-10 md:grid-cols-12 md:gap-8 lg:py-14">
        <section aria-labelledby="contact-form" className="rounded-lg bg-surface-muted p-5 sm:p-8 md:col-span-7 md:col-start-6 md:row-start-1">
          <h2 id="contact-form" className="mb-6 text-xl font-bold text-navy">
            {t('contact.formTitle')}
          </h2>
          <ContactForm locale={locale} privacyHref={localizedPath(locale, '/privacy')} />
        </section>

        <aside className="md:col-span-4 md:row-start-1">
          {hasDetails || preview ? <h2 className="mb-4 text-base font-bold text-navy">{t('contact.detailsTitle')}</h2> : null}
          {hasDetails ? (
            <dl className="mb-10 border-t border-line text-sm">
              {rows.map(([key, value]) =>
                value ? (
                  <div key={key} className="border-b border-line py-3">
                    <dt className="text-ink-muted">{t(`contact.${key}`)}</dt>
                    <dd className="mt-1 whitespace-pre-line font-medium text-ink">
                      {key === 'email' ? (
                        <a href={`mailto:${value}`} className="text-navy underline underline-offset-2">
                          {value}
                        </a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ) : null,
              )}
            </dl>
          ) : (
            <Pending label="contactDetails" className="mb-10 text-ink-muted" />
          )}

          <h2 className="text-base font-bold text-navy">{t('contact.otherWays')}</h2>
          <ul className="mt-4 border-t border-line">
            {(
              [
                ['/stores', t('stores.title'), t('home.storesBody')],
                ['/partnership', t('partnership.title'), t('partnership.forWho')],
              ] as const
            ).map(([path, title, body]) => (
              <li key={path} className="border-b border-line">
                <Link href={localizedPath(locale, path)} className="group flex items-start justify-between gap-4 py-4">
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
        </aside>
      </div>
    </PageShell>
  )
}
