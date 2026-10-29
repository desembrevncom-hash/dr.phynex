import type { CollectionAfterChangeHook, CollectionConfig, Field } from 'payload'

import { admins, nobody } from '@/access/roles'
import { emailEnabled } from '@/config/email'
import { locales } from '@/i18n/locales'

// Written only by the site's server actions (Local API, after validation + spam checks).
// The public REST/GraphQL API cannot create, read or modify submissions.
const access: CollectionConfig['access'] = {
  read: admins,
  create: nobody,
  update: admins,
  delete: admins,
}

/**
 * Emails FORM_NOTIFY_TO when a new submission is stored. The email only says that something
 * arrived and links to the admin: names, emails and messages stay in the CMS, not in mailboxes.
 * A failed email never fails the submission (it is already saved).
 */
const notifyStaff =
  (label: string): CollectionAfterChangeHook =>
  async ({ doc, operation, req, collection }) => {
    const to = process.env.FORM_NOTIFY_TO
    if (operation !== 'create' || !to || !emailEnabled()) return doc
    const adminURL = `${req.payload.config.serverURL}/admin/collections/${collection.slug}/${doc.id}`
    try {
      await req.payload.sendEmail({
        to,
        subject: `[Dr.PhynEX] ${label} #${doc.id}`,
        text: `A new ${label.toLowerCase()} was received on the website.

Open it in the CMS (login required):
${adminURL}
`,
      })
    } catch (error) {
      req.payload.logger.error({ err: error, msg: `[${collection.slug}] notification email failed for #${doc.id}` })
    }
    return doc
  }

const metaFields: Field[] = [
  {
    name: 'status',
    type: 'select',
    defaultValue: 'new',
    options: ['new', 'in-progress', 'closed'],
    admin: { position: 'sidebar' },
  },
  {
    name: 'locale',
    type: 'select',
    options: [...locales],
    admin: { position: 'sidebar', readOnly: true },
  },
  { name: 'consent', type: 'checkbox', required: true, admin: { readOnly: true } },
]

export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  admin: { group: 'Inbox', useAsTitle: 'email', defaultColumns: ['email', 'name', 'topic', 'status', 'createdAt'] },
  access,
  hooks: { afterChange: [notifyStaff('Contact message')] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'topic', type: 'select', options: ['product', 'store', 'other'] },
    { name: 'message', type: 'textarea', required: true },
    ...metaFields,
  ],
}

export const PartnerInquiries: CollectionConfig = {
  slug: 'partner-inquiries',
  labels: { singular: 'B2B inquiry', plural: 'B2B inquiries' },
  admin: {
    group: 'Inbox',
    useAsTitle: 'company',
    defaultColumns: ['company', 'contactName', 'country', 'businessType', 'status', 'createdAt'],
  },
  access,
  hooks: { afterChange: [notifyStaff('B2B inquiry')] },
  fields: [
    { name: 'company', type: 'text', required: true },
    { name: 'contactName', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'country', type: 'text', required: true },
    {
      name: 'businessType',
      type: 'select',
      required: true,
      options: ['distributor', 'retailer', 'spa-clinic', 'online', 'other'],
    },
    { name: 'channels', type: 'textarea' },
    { name: 'message', type: 'textarea', required: true },
    ...metaFields,
  ],
}
