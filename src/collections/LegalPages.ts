import { editorsField } from '@/access/roles'

import { contentCollection } from './factory'

export const legalSlugs = ['privacy', 'terms'] as const

export const LegalPages = contentCollection({
  slug: 'legal-pages',
  admin: { useAsTitle: 'title', group: 'Pages' },
  fields: [
    {
      name: 'slug',
      type: 'select',
      required: true,
      unique: true,
      index: true,
      options: [...legalSlugs],
      access: { create: editorsField, update: editorsField },
      admin: { position: 'sidebar' },
    },
    { name: 'title', type: 'text', localized: true, required: true },
    { name: 'body', type: 'richText', localized: true },
  ],
})
