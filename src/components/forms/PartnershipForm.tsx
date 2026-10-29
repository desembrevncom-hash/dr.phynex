'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { submitPartnership } from '@/app/(frontend)/[locale]/actions'
import type { Locale } from '@/i18n/locales'
import { initialFormState } from '@/lib/formState'

import { ConsentField, FormStatus, Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from './FormParts'

const businessTypes = ['distributor', 'retailer', 'spa-clinic', 'online', 'other'] as const

export function PartnershipForm({ locale, privacyHref }: { locale: Locale; privacyHref: string }) {
  const t = useTranslations('form')
  const [state, action] = useActionState(submitPartnership, initialFormState)

  if (state.status === 'success') return <FormStatus state={state} />

  return (
    <form action={action} noValidate className="relative space-y-5">
      <FormStatus state={state} />
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />
      <TextField name="company" label={t('company')} state={state} required autoComplete="organization" maxLength={200} />
      <TextField name="contactName" label={t('contactName')} state={state} required autoComplete="name" maxLength={120} />
      <TextField name="email" type="email" label={t('email')} state={state} required autoComplete="email" maxLength={200} />
      <TextField name="phone" type="tel" label={t('phone')} state={state} autoComplete="tel" maxLength={40} />
      <TextField name="country" label={t('country')} state={state} required autoComplete="country-name" maxLength={80} />
      <SelectField
        name="businessType"
        label={t('businessType')}
        state={state}
        required
        options={businessTypes.map((v) => ({ value: v, label: t(`businessTypes.${v}`) }))}
      />
      <TextAreaField name="channels" label={t('channels')} state={state} rows={3} maxLength={2000} />
      <TextAreaField name="message" label={t('message')} state={state} required maxLength={5000} />
      <ConsentField state={state} privacyHref={privacyHref} />
      <SubmitButton />
    </form>
  )
}
