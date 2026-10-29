import { editorsField } from '@/access/roles'
import { contentGlobal } from '@/collections/factory'
import { seoField } from '@/fields/common'

const editorOnly = { create: editorsField, update: editorsField }

export const SiteSettings = contentGlobal({
  slug: 'site-settings',
  admin: { group: 'Settings' },
  fields: [
    { name: 'logo', type: 'upload', relationTo: 'media', access: editorOnly },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email', access: editorOnly },
        { name: 'phone', type: 'text', access: editorOnly },
        { name: 'address', type: 'textarea', localized: true },
        { name: 'hours', type: 'textarea', localized: true },
      ],
    },
    {
      name: 'social',
      type: 'array',
      access: editorOnly,
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
  ],
})

export const HomePage = contentGlobal({
  slug: 'home-page',
  admin: { group: 'Pages' },
  fields: [
    { name: 'headline', type: 'text', localized: true },
    { name: 'intro', type: 'textarea', localized: true },
    { name: 'heroImage', type: 'upload', relationTo: 'media', access: editorOnly },
    { name: 'featuredProducts', type: 'relationship', relationTo: 'products', hasMany: true, access: editorOnly },
    { name: 'featuredIngredients', type: 'relationship', relationTo: 'ingredients', hasMany: true, access: editorOnly },
    seoField,
  ],
})

export const BrandPage = contentGlobal({
  slug: 'brand-page',
  admin: { group: 'Pages' },
  fields: [
    { name: 'title', type: 'text', localized: true },
    { name: 'intro', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    seoField,
  ],
})

export const PartnershipPage = contentGlobal({
  slug: 'partnership-page',
  admin: { group: 'Pages' },
  fields: [
    { name: 'title', type: 'text', localized: true },
    { name: 'intro', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    seoField,
  ],
})
