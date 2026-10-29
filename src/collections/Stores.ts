import { editorsField } from '@/access/roles'
import { orderField } from '@/fields/common'

import { contentCollection } from './factory'

const editorOnly = { create: editorsField, update: editorsField }

export const Stores = contentCollection({
  slug: 'stores',
  admin: { useAsTitle: 'name', group: 'Stores', defaultColumns: ['name', 'type', 'country', 'city'] },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', localized: true, required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'store',
      access: editorOnly,
      options: [
        { label: 'Store', value: 'store' },
        { label: 'Distributor', value: 'distributor' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'country',
      type: 'text',
      required: true,
      index: true,
      access: editorOnly,
      admin: { description: 'ISO 3166-1 alpha-2 code, e.g. KR, VN, US.' },
    },
    { name: 'city', type: 'text', localized: true },
    { name: 'address', type: 'textarea', localized: true },
    { name: 'hours', type: 'textarea', localized: true },
    { name: 'phone', type: 'text', access: editorOnly },
    { name: 'url', type: 'text', access: editorOnly },
    {
      type: 'row',
      fields: [
        { name: 'lat', type: 'number', access: editorOnly },
        { name: 'lng', type: 'number', access: editorOnly },
      ],
    },
    orderField,
  ],
})
