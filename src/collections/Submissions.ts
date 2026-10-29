import type { CollectionConfig, Field } from 'payload'

import { admins, nobody } from '@/access/roles'
import { locales } from '@/i18n/locales'

// Written only by the site's server actions (Local API, after validation + spam checks).
// The public REST/GraphQL API cannot create, read or modify submissions.
const access: CollectionConfig['access'] = {
  read: admins,
  create: nobody,
  update: admins,
  delete: admins,
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
