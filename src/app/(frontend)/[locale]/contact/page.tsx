import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ContactForm } from '@/components/forms/ContactForm'
import { PageShell } from '@/components/layout/PageShell'
import { PageHeading } from '@/components/ui/PageHeading'
import { findPublicGlobal } from '@/lib/content'
import { pageLocale, type LocaleParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getTranslations({ locale, namespace: 'contact' })
  return { title: t('title'), alternates: alternatesFor(locale, '/contact') }
}

export default async function ContactPage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, settings] = await Promise.all([getTranslations('contact'), findPublicGlobal('site-settings', locale)])
  const contact = settings?.contact

  return (
    <PageShell locale={locale} path="/contact">
      <PageHeading>{t('title')}</PageHeading>
      <div className="grid gap-12 md:grid-cols-[1fr_1.4fr]">
        {/* Contact details appear only once Site settings are published + approved for this locale. */}
        {contact && (contact.email || contact.phone || contact.address) ? (
          <dl className="space-y-4">
            {contact.email ? (
              <div>
                <dt className="text-sm font-semibold text-ink-muted">{t('email')}</dt>
                <dd>
                  <a href={`mailto:${contact.email}`} className="underline underline-offset-2">
                    {contact.email}
                  </a>
                </dd>
              </div>
            ) : null}
            {contact.phone ? (
              <div>
                <dt className="text-sm font-semibold text-ink-muted">{t('phone')}</dt>
                <dd>{contact.phone}</dd>
              </div>
            ) : null}
            {contact.address ? (
              <div>
                <dt className="text-sm font-semibold text-ink-muted">{t('address')}</dt>
                <dd className="whitespace-pre-line">{contact.address}</dd>
              </div>
            ) : null}
            {contact.hours ? (
              <div>
                <dt className="text-sm font-semibold text-ink-muted">{t('hours')}</dt>
                <dd className="whitespace-pre-line">{contact.hours}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <div aria-hidden="true" />
        )}
        <section aria-labelledby="contact-form">
          <h2 id="contact-form" className="mb-5 text-xl font-semibold">
            {t('formTitle')}
          </h2>
          <ContactForm locale={locale} privacyHref={localizedPath(locale, '/privacy')} />
        </section>
      </div>
    </PageShell>
  )
}
