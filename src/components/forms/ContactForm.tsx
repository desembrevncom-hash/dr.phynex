'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { submitContact } from '@/app/(frontend)/[locale]/actions'
import type { Locale } from '@/i18n/locales'
import { initialFormState } from '@/lib/formState'

import { ConsentField, FormStatus, Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from './FormParts'

export function ContactForm({ locale, privacyHref }: { locale: Locale; privacyHref: string }) {
  const t = useTranslations('form')
  const [state, action] = useActionState(submitContact, initialFormState)

  if (state.status === 'success') return <FormStatus state={state} />

  return (
    <form action={action} noValidate className="relative space-y-5">
      <FormStatus state={state} />
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />
      <TextField name="name" label={t('name')} state={state} required autoComplete="name" maxLength={120} />
      <TextField name="email" type="email" label={t('email')} state={state} required autoComplete="email" maxLength={200} />
      <TextField name="phone" type="tel" label={t('phone')} state={state} autoComplete="tel" maxLength={40} />
      <SelectField
        name="topic"
        label={t('topic')}
        state={state}
        options={(['product', 'store', 'other'] as const).map((v) => ({ value: v, label: t(`topics.${v}`) }))}
      />
      <TextAreaField name="message" label={t('message')} state={state} required maxLength={5000} />
      <ConsentField state={state} privacyHref={privacyHref} />
      <SubmitButton />
    </form>
  )
}
