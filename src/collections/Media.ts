import type { Access, CollectionConfig } from 'payload'

import { editors, editorsField, isStaffUser, staff } from '@/access/roles'

// Guests only see files an editor has cleared for publication; staff see everything
// (draft previews load unreleased files with the admin session cookie).
const releasedOrStaff: Access = ({ req }) =>
  isStaffUser(req.user) ? true : { publicRelease: { equals: true } }

// Local: files on disk (./media, git-ignored). With S3_BUCKET set: private object storage (src/config/storage.ts).
export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Assets',
    defaultColumns: ['filename', 'alt', 'publicRelease', 'updatedAt'],
    description:
      'Files stay private until "Cleared for publication" is ticked. Only tick it for images the brand has approved for public use; internal documents go in Source documents.',
  },
  access: {
    read: releasedOrStaff,
    create: editors,
    update: staff,
    delete: editors,
  },
  fields: [
    { name: 'alt', type: 'text', localized: true, required: true },
    { name: 'caption', type: 'text', localized: true },
    { name: 'credit', type: 'text' },
    {
      name: 'publicRelease',
      label: 'Cleared for publication',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      access: { create: editorsField, update: editorsField },
      admin: {
        position: 'sidebar',
        description: 'Visitors can only view or list this file when ticked.',
      },
    },
    {
      name: 'reviewNote',
      type: 'textarea',
      access: { read: editorsField, create: editorsField, update: editorsField },
      admin: {
        position: 'sidebar',
        description: 'Internal: source of the image and how it was checked against the packaging artwork.',
      },
    },
  ],
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
  },
}
