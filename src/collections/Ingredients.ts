import type { Field } from 'payload'

import { editorsField } from '@/access/roles'
import { orderField, seoField, slugField } from '@/fields/common'

import { contentCollection } from './factory'

const sourcesField: Field = {
  name: 'sources',
  type: 'array',
  admin: { description: 'Internal references backing this description. Not shown publicly.' },
  access: { read: editorsField, create: editorsField, update: editorsField },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'file', type: 'upload', relationTo: 'source-documents' },
    { name: 'note', type: 'textarea' },
  ],
}

const sharedFields: Field[] = [
  { name: 'name', type: 'text', localized: true, required: true },
  { name: 'summary', type: 'textarea', localized: true },
  { name: 'body', type: 'richText', localized: true },
  { name: 'image', type: 'upload', relationTo: 'media', access: { create: editorsField, update: editorsField } },
  sourcesField,
  seoField,
  slugField,
  orderField,
]

export const Ingredients = contentCollection({
  slug: 'ingredients',
  admin: { useAsTitle: 'name', group: 'Catalog', defaultColumns: ['name', 'inciName', 'slug'] },
  defaultSort: 'order',
  fields: [
    ...sharedFields.slice(0, 1),
    {
      name: 'inciName',
      type: 'text',
      access: { create: editorsField, update: editorsField },
      admin: { description: 'Standard INCI name (not translated).' },
    },
    ...sharedFields.slice(1),
  ],
})

export const Technologies = contentCollection({
  slug: 'technologies',
  admin: { useAsTitle: 'name', group: 'Catalog' },
  defaultSort: 'order',
  fields: sharedFields,
})
