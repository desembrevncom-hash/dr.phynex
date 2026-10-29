import { orderField, slugField } from '@/fields/common'

import { contentCollection } from './factory'

export const ProductLines = contentCollection({
  slug: 'product-lines',
  admin: { useAsTitle: 'name', group: 'Catalog', defaultColumns: ['name', 'slug', 'order'] },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', localized: true, required: true },
    { name: 'description', type: 'textarea', localized: true },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    slugField,
    orderField,
  ],
})

export const ProductCategories = contentCollection({
  slug: 'product-categories',
  admin: { useAsTitle: 'name', group: 'Catalog' },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', localized: true, required: true },
    slugField,
    orderField,
  ],
})

export const SkinConcerns = contentCollection({
  slug: 'skin-concerns',
  admin: { useAsTitle: 'name', group: 'Catalog' },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', localized: true, required: true },
    slugField,
    orderField,
  ],
})

export const JournalTopics = contentCollection({
  slug: 'journal-topics',
  admin: { useAsTitle: 'name', group: 'Journal' },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', localized: true, required: true },
    slugField,
    orderField,
  ],
})
