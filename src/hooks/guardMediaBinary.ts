import { APIError, type CollectionBeforeOperationHook } from 'payload'
import { isEditorUser } from '@/access/roles'

/** Runs before generateFileData: beforeChange is already too late for crop/refocal. */
export const guardMediaBinary: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation !== 'update') return args
  const options = args as unknown as { id?: string | number; data?: Record<string, unknown> }
  const data = options.data ?? {}
  const edits = req.query?.uploadEdits
  const queryEdit = edits && typeof edits === 'object' && Object.keys(edits).length > 0
  const focalFields = 'focalX' in data || 'focalY' in data
  if (!req.file && !queryEdit && !focalFields) return args
  // Payload's bulk update has no single original file identity. Never transform in bulk.
  if (typeof options.id !== 'string' && typeof options.id !== 'number') {
    throw new APIError('Binary media edits require an individual record.', 403, null, true)
  }
  const original = await req.payload.findByID({ collection: 'media', id: options.id, req, depth: 0, overrideAccess: true })
  const focalChanged = ('focalX' in data && data.focalX !== original.focalX) ||
    ('focalY' in data && data.focalY !== original.focalY)
  if (!req.file && !queryEdit && !focalChanged) return args
  if (!isEditorUser(req.user)) {
    throw new APIError('Only editors may replace or transform media binaries.', 403, null, true)
  }
  if (original.publicRelease) {
    throw new APIError('Create a new unreleased Media record, then approve and replace its relationship. Released binaries cannot be overwritten.', 409, null, true)
  }
  return args
}
