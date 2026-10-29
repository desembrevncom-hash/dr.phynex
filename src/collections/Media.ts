import type { CollectionConfig } from 'payload'

import { anyone, editors, staff } from '@/access/roles'

// Local: files on disk (./media, git-ignored). Production: swap to @payloadcms/storage-s3 (R2/S3).
export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Assets' },
  access: {
    read: anyone,
    create: editors,
    update: staff,
    delete: editors,
  },
  fields: [
    { name: 'alt', type: 'text', localized: true, required: true },
    { name: 'caption', type: 'text', localized: true },
    { name: 'credit', type: 'text' },
  ],
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
  },
}
