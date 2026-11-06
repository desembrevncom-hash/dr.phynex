import { isDeepStrictEqual } from 'node:util'
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
  const identityFields = [
    'filename',
    'url',
    'mimeType',
    'filesize',
    'width',
    'height',
    'sizes',
    'prefix',
    '_objectKey',
  ]
  const identitySubmitted = identityFields.some((key) => key in data)
  if (!req.file && !queryEdit && !focalFields && !identitySubmitted) return args
  // Payload's bulk update has no single original file identity. Never transform in bulk.
  if (typeof options.id !== 'string' && typeof options.id !== 'number') {
    throw new APIError('Việc sửa tệp media phải thực hiện trên từng bản ghi riêng lẻ.', 403, null, true)
  }
  const original = await req.payload.findByID({
    collection: 'media',
    id: options.id,
    req,
    depth: 0,
    overrideAccess: true,
  })
  const focalChanged =
    ('focalX' in data && data.focalX !== original.focalX) ||
    ('focalY' in data && data.focalY !== original.focalY)
  const identityChanged = identityFields.some(
    (key) =>
      key in data &&
      !isDeepStrictEqual(data[key], (original as unknown as Record<string, unknown>)[key]),
  )
  if (!req.file && !queryEdit && !focalChanged && !identityChanged) return args
  if (!isEditorUser(req.user)) {
    throw new APIError('Chỉ biên tập viên mới được thay hoặc biến đổi tệp media.', 403, null, true)
  }
  if (original.publicRelease) {
    throw new APIError(
      'Hãy tạo bản ghi Media mới chưa công khai, duyệt rồi thay liên kết. Không thể ghi đè tệp đã công khai.',
      409,
      null,
      true,
    )
  }
  return args
}
