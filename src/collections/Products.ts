import { editorsField, staffField } from '@/access/roles'
import { seoField, slugField } from '@/fields/common'

import { contentCollection } from './factory'

const editorOnly = { create: editorsField, update: editorsField }

export const Products = contentCollection({
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    group: 'Catalog',
    defaultColumns: ['name', 'line', 'slug', '_status', 'translationStatus'],
    description:
      'Introduction only: no prices or purchase links. Calls to action point to Stores and Contact.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Overview',
          fields: [
            { name: 'name', type: 'text', localized: true, required: true },
            { name: 'shortDescription', type: 'textarea', localized: true },
            { name: 'description', type: 'richText', localized: true },
            { name: 'images', type: 'upload', relationTo: 'media', hasMany: true, access: editorOnly },
          ],
        },
        {
          label: 'Claims',
          description:
            'Internal editorial rule: every claim must cite a brand-provided source before publishing. ' +
            'This is an editorial check only, not a certification of legal or regulatory compliance.',
          fields: [
            {
              name: 'claims',
              type: 'array',
              localized: true,
              labels: { singular: 'Claim', plural: 'Claims' },
              fields: [
                { name: 'text', type: 'textarea', required: true },
                {
                  name: 'sourceDocument',
                  type: 'text',
                  required: true,
                  access: { read: staffField },
                  admin: {
                    description: 'Name/reference of the brand document this claim comes from (required to publish).',
                  },
                },
                {
                  name: 'sourceFile',
                  type: 'upload',
                  relationTo: 'source-documents',
                  access: { read: staffField },
                },
                { name: 'sourceNote', type: 'textarea', access: { read: staffField } },
              ],
            },
          ],
        },
        {
          label: 'Ingredients & use',
          fields: [
            { name: 'keyIngredients', type: 'relationship', relationTo: 'ingredients', hasMany: true, access: editorOnly },
            { name: 'technologies', type: 'relationship', relationTo: 'technologies', hasMany: true, access: editorOnly },
            {
              name: 'inci',
              type: 'textarea',
              access: editorOnly,
              admin: { description: 'Full INCI list as provided by the brand (not translated).' },
            },
            { name: 'howToUse', type: 'richText', localized: true },
            { name: 'cautions', type: 'richText', localized: true },
          ],
        },
        {
          label: 'Classification',
          fields: [
            { name: 'line', type: 'relationship', relationTo: 'product-lines', index: true, access: editorOnly },
            { name: 'categories', type: 'relationship', relationTo: 'product-categories', hasMany: true, access: editorOnly },
            { name: 'concerns', type: 'relationship', relationTo: 'skin-concerns', hasMany: true, access: editorOnly },
            {
              name: 'skinTypes',
              type: 'select',
              hasMany: true,
              access: editorOnly,
              options: ['dry', 'oily', 'combination', 'normal', 'sensitive'],
            },
            { name: 'sku', type: 'text', access: editorOnly },
            { name: 'volume', type: 'text', access: editorOnly, admin: { description: 'e.g. "50 mL"' } },
            { name: 'related', type: 'relationship', relationTo: 'products', hasMany: true, access: editorOnly },
          ],
        },
        { label: 'SEO', fields: [seoField] },
      ],
    },
    slugField,
  ],
})
