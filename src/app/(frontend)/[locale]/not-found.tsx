import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { isLocale, routingDefaultLocale } from '@/i18n/locales'
import { localizedPath } from '@/lib/seo'

export default async function NotFound() {
  const current = await getLocale()
  const locale = isLocale(current) ? current : routingDefaultLocale
  const t = await getTranslations({ locale })

  return (
    <PageShell locale={locale} path="">
      <h1 className="text-3xl font-semibold tracking-tight">{t('notFound.title')}</h1>
      <p className="mt-3 max-w-prose text-ink-muted">{t('notFound.body')}</p>
      <p className="mt-6">
        <Link href={localizedPath(locale, '')} className="underline underline-offset-4">
          {t('common.backHome')}
        </Link>
      </p>
    </PageShell>
  )
}
