'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import type { Consent } from '@/lib/analytics/consent'

const button =
  'inline-flex min-h-11 items-center justify-center rounded border border-navy px-5 text-sm font-semibold text-navy transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'

/**
 * Consent choice. "Accept all" and "Reject all" have equal weight; nothing is pre-ticked and
 * nothing loads until a choice is saved. Not modal: the page stays usable behind it.
 */
export function ConsentBanner({
  initial,
  privacyHref,
  onDecide,
}: {
  initial: Consent | null
  privacyHref: string
  onDecide: (consent: Consent) => void
}) {
  const t = useTranslations('consent')
  const titleId = useId()
  const [details, setDetails] = useState(false)
  const [analytics, setAnalytics] = useState(initial?.analytics ?? false)
  const [marketing, setMarketing] = useState(initial?.marketing ?? false)

  return (
    <section
      role="region"
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-navy bg-surface shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
    >
      <div className="container-page grid gap-4 py-5 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="lg:col-span-7">
          <h2 id={titleId} className="text-base font-bold text-navy">
            {t('title')}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {t('body')}{' '}
            <a href={privacyHref} className="text-navy underline underline-offset-2">
              {t('privacy')}
            </a>
          </p>
          {details ? (
            <fieldset className="mt-3 grid gap-2 text-sm text-ink">
              <legend className="sr-only">{t('customize')}</legend>
              <label className="flex items-center gap-2 text-ink-muted">
                <input type="checkbox" checked disabled className="size-4" />
                {t('necessary')}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="size-4 accent-navy" />
                {t('analytics')}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="size-4 accent-navy" />
                {t('marketing')}
              </label>
            </fieldset>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
          {details ? (
            <button type="button" className={button} onClick={() => onDecide({ analytics, marketing })}>
              {t('save')}
            </button>
          ) : (
            <button type="button" className={`${button} border-transparent underline underline-offset-4`} onClick={() => setDetails(true)}>
              {t('customize')}
            </button>
          )}
          <button type="button" className={button} onClick={() => onDecide({ analytics: false, marketing: false })}>
            {t('reject')}
          </button>
          <button type="button" className={button} onClick={() => onDecide({ analytics: true, marketing: true })}>
            {t('accept')}
          </button>
        </div>
      </div>
    </section>
  )
}
