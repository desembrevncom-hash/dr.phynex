import { editorsField } from '@/access/roles'
import { seoField, slugField } from '@/fields/common'

import { contentCollection } from './factory'

const editorOnly = { create: editorsField, update: editorsField }

export const Articles = contentCollection({
  slug: 'articles',
  labels: { singular: 'Journal article', plural: 'Journal' },
  admin: {
    useAsTitle: 'title',
    group: 'Journal',
    defaultColumns: ['title', 'topic', 'publishedAt', '_status', 'translationStatus'],
  },
  defaultSort: '-publishedAt',
  fields: [
    { name: 'title', type: 'text', localized: true, required: true },
    { name: 'excerpt', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    { name: 'cover', type: 'upload', relationTo: 'media', access: editorOnly },
    { name: 'topic', type: 'relationship', relationTo: 'journal-topics', access: editorOnly },
    { name: 'relatedProducts', type: 'relationship', relationTo: 'products', hasMany: true, access: editorOnly },
    { name: 'author', type: 'text', access: editorOnly },
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      access: editorOnly,
      admin: { position: 'sidebar' },
    },
    seoField,
    slugField,
  ],
})
