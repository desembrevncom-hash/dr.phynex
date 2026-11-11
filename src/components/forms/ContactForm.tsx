'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { submitContact } from '@/app/(frontend)/[locale]/actions'
import type { Locale } from '@/i18n/locales'
import { initialFormState, type FormState } from '@/lib/formState'

import { ConsentField, FormStatus, Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from './FormParts'
import { useLeadEvent } from './useLeadEvent'

export type InterestProduct = { slug: string; name: string }

export function ContactForm({
  locale,
  privacyHref,
  product,
  clearProductHref,
}: {
  locale: Locale
  privacyHref: string
  /** Product the visitor came from (already checked against what they may see). */
  product?: InterestProduct | null
  /** The same contact page without the product. */
  clearProductHref?: string
}) {
  const t = useTranslations()
  // Coming from a product page: the topic starts as "product" (still changeable).
  const initial: FormState = product ? { status: 'idle', values: { topic: 'product' } } : initialFormState
  const [state, action] = useActionState(submitContact, initial)
  useLeadEvent('contact', state)

  if (state.status === 'success') return <FormStatus state={state} />

  return (
    <form action={action} noValidate className="relative space-y-5">
      <FormStatus state={state} />
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />
      {product ? (
        <div role="group" aria-labelledby="f-product-label" className="rounded border border-line-strong bg-surface p-4">
          <p className="text-sm text-ink-muted" id="f-product-label">
            {t('contact.productLabel')}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <p className="text-base font-semibold text-navy">
              {product.name}
            </p>
            {clearProductHref ? (
              <a href={clearProductHref} className="text-sm font-medium text-navy underline underline-offset-2">
                {t('contact.productRemove')}
              </a>
            ) : null}
          </div>
          <input type="hidden" name="product" value={product.slug} />
        </div>
      ) : null}
      <TextField name="name" label={t('form.name')} state={state} required autoComplete="name" maxLength={120} />
      <TextField name="email" type="email" label={t('form.email')} state={state} required autoComplete="email" maxLength={200} />
      <TextField name="phone" type="tel" label={t('form.phone')} state={state} autoComplete="tel" maxLength={40} />
      <SelectField
        name="topic"
        label={t('form.topic')}
        state={state}
        options={(['product', 'store', 'other'] as const).map((v) => ({ value: v, label: t(`form.topics.${v}`) }))}
      />
      <TextAreaField name="message" label={t('form.message')} state={state} required maxLength={5000} />
      <ConsentField state={state} privacyHref={privacyHref} />
      <SubmitButton />
    </form>
  )
}
