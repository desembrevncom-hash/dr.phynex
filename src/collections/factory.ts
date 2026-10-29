import { publishOnlyRequestedLocale, publishOnlyRequestedGlobalLocale } from '@/hooks/publishLocale'
import type { CollectionConfig, Field, GlobalConfig } from 'payload'

import { editors, publishedAndApproved, staff } from '@/access/roles'
import { translationStatusField } from '@/fields/translationStatus'
import { guardGlobalPublishing, guardPublishing } from '@/hooks/guardPublishing'

type ContentCollectionArgs = Omit<CollectionConfig, 'access' | 'versions' | 'fields'> & {
  fields: Field[]
}

/**
 * Public, localized, versioned content.
 * - read: guests get published + approved-for-this-locale only (server-side Where)
 * - create/delete: editors · update: staff (translators edit drafts, cannot publish)
 */
export const contentCollection = ({ fields, hooks, ...config }: ContentCollectionArgs): CollectionConfig => ({
  ...config,
  access: {
    read: publishedAndApproved,
    readVersions: staff,
    create: editors,
    update: staff,
    delete: editors,
  },
  versions: { drafts: true, maxPerDoc: 50 },
  hooks: {
    ...hooks,
    beforeOperation: [publishOnlyRequestedLocale, ...(hooks?.beforeOperation ?? [])],
    beforeChange: [guardPublishing, ...(hooks?.beforeChange ?? [])],
  },
  fields: [...fields, translationStatusField],
})

type ContentGlobalArgs = Omit<GlobalConfig, 'access' | 'versions' | 'fields'> & { fields: Field[] }

export const contentGlobal = ({ fields, hooks, ...config }: ContentGlobalArgs): GlobalConfig => ({
  ...config,
  access: {
    read: publishedAndApproved,
    readVersions: staff,
    update: staff,
  },
  versions: { drafts: true, max: 50 },
  hooks: {
    ...hooks,
    beforeOperation: [publishOnlyRequestedGlobalLocale, ...(hooks?.beforeOperation ?? [])],
    beforeChange: [guardGlobalPublishing, ...(hooks?.beforeChange ?? [])],
  },
  fields: [...fields, translationStatusField],
})
