import type { CollectionConfig } from 'payload'

import { admins, editors, staff } from '@/access/roles'

/** Brand-provided evidence for claims. Never public. */
export const SourceDocuments: CollectionConfig = {
  slug: 'source-documents',
  admin: {
    group: 'Assets',
    useAsTitle: 'title',
    description: 'Internal reference files (e.g. product dossiers). Staff only, never served publicly.',
  },
  access: {
    read: staff,
    create: editors,
    update: editors,
    delete: admins,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'note', type: 'textarea' },
  ],
  upload: {
    staticDir: 'private-uploads/source-documents',
    mimeTypes: ['application/pdf', 'image/*'],
  },
}
