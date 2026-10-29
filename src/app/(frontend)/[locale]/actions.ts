'use server'

import { headers } from 'next/headers'

import { isLocale } from '@/i18n/locales'
import { getPayloadClient } from '@/lib/content'
import { isBot, validate, type FormState } from '@/lib/forms'
import { clientIp, rateLimitKey, sharedRateLimited } from '@/lib/rate-limit'

const contactTopics = ['product', 'store', 'other'] as const
const businessTypes = ['distributor', 'retailer', 'spa-clinic', 'online', 'other'] as const

async function rateLimited(form: 'contact' | 'partnership') {
  const payload = await getPayloadClient()
  return sharedRateLimited(payload, rateLimitKey(form, clientIp(await headers())))
}

const localeOf = (formData: FormData) => {
  const value = formData.get('locale')
  return isLocale(value) ? value : undefined
}

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isBot(formData)) return { status: 'success' }

  const { values, errors, ok } = validate(formData, {
    name: { required: true, max: 120 },
    email: { required: true, max: 200, email: true },
    phone: { max: 40 },
    topic: { max: 20, options: contactTopics },
    message: { required: true, max: 5000 },
  })
  if (!ok) return { status: 'error', code: 'invalid', errors, values }
  try {
    if (await rateLimited('contact')) return { status: 'error', code: 'rateLimited', values }
    const payload = await getPayloadClient()
    // Public API cannot create submissions; this trusted server path writes after validation.
    await payload.create({
      collection: 'contact-submissions',
      overrideAccess: true,
      data: {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        topic: (values.topic || undefined) as (typeof contactTopics)[number] | undefined,
        message: values.message,
        consent: true,
        locale: localeOf(formData),
        status: 'new',
      },
    })
    return { status: 'success' }
  } catch (error) {
    console.error('[contact] failed to store submission', error instanceof Error ? error.name : 'UnknownError')
    return { status: 'error', code: 'server', values }
  }
}

export async function submitPartnership(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isBot(formData)) return { status: 'success' }

  const { values, errors, ok } = validate(formData, {
    company: { required: true, max: 200 },
    contactName: { required: true, max: 120 },
    email: { required: true, max: 200, email: true },
    phone: { max: 40 },
    country: { required: true, max: 80 },
    businessType: { required: true, max: 20, options: businessTypes },
    channels: { max: 2000 },
    message: { required: true, max: 5000 },
  })
  if (!ok) return { status: 'error', code: 'invalid', errors, values }
  try {
    if (await rateLimited('partnership')) return { status: 'error', code: 'rateLimited', values }
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'partner-inquiries',
      overrideAccess: true,
      data: {
        company: values.company,
        contactName: values.contactName,
        email: values.email,
        phone: values.phone || undefined,
        country: values.country,
        businessType: values.businessType as (typeof businessTypes)[number],
        channels: values.channels || undefined,
        message: values.message,
        consent: true,
        locale: localeOf(formData),
        status: 'new',
      },
    })
    return { status: 'success' }
  } catch (error) {
    console.error('[partnership] failed to store inquiry', error instanceof Error ? error.name : 'UnknownError')
    return { status: 'error', code: 'server', values }
  }
}
