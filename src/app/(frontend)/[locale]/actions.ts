'use server'

import { randomUUID } from 'crypto'
import { headers } from 'next/headers'

import { isLocale } from '@/i18n/locales'
import { findPublicBySlug, getPayloadClient } from '@/lib/content'
import { duplicateWindowStart, interestMessage, productSlugPattern } from '@/lib/contact-interest'
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
  const locale = localeOf(formData)
  const productSlug = formData.get('product')
  if (typeof productSlug === 'string' && productSlugPattern.test(productSlug)) values.product = productSlug
  if (!ok) return { status: 'error', code: 'invalid', errors, values }
  try {
    if (await rateLimited('contact')) return { status: 'error', code: 'rateLimited', values }
    const payload = await getPayloadClient()
    // The product of interest is kept only if this visitor can actually see it (same access rules
    // as the page); anything else is dropped, never echoed. No schema field: it leads the message.
    const product = values.product && locale ? await findPublicBySlug('products', values.product, locale, 0) : null
    const message = product ? interestMessage(product.name, product.slug ?? values.product, values.message) : values.message
    // Same email + same message within the window = a repeated click or resubmit: report success
    // again without storing a second copy or counting a second lead.
    const repeat = await payload.find({
      collection: 'contact-submissions',
      overrideAccess: true,
      depth: 0,
      limit: 1,
      pagination: false,
      where: {
        and: [
          { email: { equals: values.email } },
          { message: { equals: message } },
          { createdAt: { greater_than: duplicateWindowStart().toISOString() } },
        ],
      },
    })
    if (repeat.docs.length > 0) return { status: 'success' }
    // Public API cannot create submissions; this trusted server path writes after validation.
    await payload.create({
      collection: 'contact-submissions',
      overrideAccess: true,
      data: {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        topic: (values.topic || undefined) as (typeof contactTopics)[number] | undefined,
        message,
        consent: true,
        locale,
        status: 'new',
      },
    })
    // Bots caught by the honeypot also see "success" but never get a leadId (no lead counted).
    return { status: 'success', leadId: randomUUID() }
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
    return { status: 'success', leadId: randomUUID() }
  } catch (error) {
    console.error('[partnership] failed to store inquiry', error instanceof Error ? error.name : 'UnknownError')
    return { status: 'error', code: 'server', values }
  }
}
