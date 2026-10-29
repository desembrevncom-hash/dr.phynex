import type { Field } from 'payload'

import { editorsField } from '@/access/roles'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Shared across /ko, /en, /vi (not localized). */
export const slugField: Field = {
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  access: { create: editorsField, update: editorsField },
  admin: {
    position: 'sidebar',
    description: 'Lowercase letters, numbers and hyphens. Shared by all languages.',
  },
  validate: (value: unknown) =>
    typeof value === 'string' && slugPattern.test(value)
      ? true
      : 'Use lowercase letters, numbers and single hyphens (e.g. "hydra-cream").',
}

export const orderField: Field = {
  name: 'order',
  type: 'number',
  defaultValue: 0,
  access: { create: editorsField, update: editorsField },
  admin: { position: 'sidebar' },
}

export const seoField: Field = {
  name: 'seo',
  type: 'group',
  localized: true,
  fields: [
    { name: 'title', type: 'text' },
    { name: 'description', type: 'textarea' },
  ],
}
