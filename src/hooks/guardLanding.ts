import { isDeepStrictEqual } from 'node:util'
import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { isEditorUser } from '@/access/roles'
import { landingStructure } from '@/lib/landing'

/**
 * The landing page STRUCTURE (blocks, order, hide, tone, layout, images) is shared by every
 * language, so only editors may change it. Translators can still edit the texts of the language
 * they are working on. Approval: any change inside the landing blocks counts as a content change
 * for the language being saved (guardPublishing), so it goes back to "In review".
 */
export const guardLanding: CollectionBeforeChangeHook = ({ data, originalDoc, req, operation }) => {
  if (!data || !('landing' in data)) return data
  const before = operation === 'create' ? [] : (originalDoc as Record<string, unknown> | undefined)?.landing
  if (req.user && !isEditorUser(req.user) && !isDeepStrictEqual(landingStructure(before), landingStructure(data.landing))) {
    throw new APIError(
      'Chỉ biên tập viên hoặc quản trị viên mới được thêm, xoá, sắp xếp, ẩn khối hay đổi ảnh/kiểu nền của landing page (dùng chung cho mọi ngôn ngữ). Bạn vẫn có thể sửa chữ trong các khối.',
      403,
      null,
      true,
    )
  }
  return data
}
