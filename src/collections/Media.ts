import { privateUploadHeaders } from '@/lib/uploadHeaders'
import { APIError, type Access, type CollectionConfig } from 'payload'

import { editors, editorsField, isStaffUser, isEditorUser, staff } from '@/access/roles'

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
  hooks: {
    beforeOperation: [async ({ args, operation, req }) => {
      if (operation === 'update' && req.file && req.user && !isEditorUser(req.user)) {
        throw new APIError('Only editors may replace media binaries.', 403, null, true)
      }
      if (operation === 'update' && req.file && 'id' in args && (typeof args.id === 'string' || typeof args.id === 'number')) {
        const original = await req.payload.findByID({ collection: 'media', id: args.id, req, overrideAccess: true })
        if (original.publicRelease) {
          throw new APIError('Create a new unreleased Media record, then approve and replace its relationship. Released binaries cannot be overwritten.', 409, null, true)
        }
      }
      return args
    }],
    beforeChange: [({ data, req, operation }) => {
      if (operation === 'update' && req.file) data.publicRelease = false
      return data
    }],
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
    modifyResponseHeaders: privateUploadHeaders,
    staticDir: 'media',
    mimeTypes: ['image/*'],
  },
}
