import { APIError, type CollectionBeforeChangeHook, type GlobalBeforeChangeHook } from 'payload'

import { isEditorUser } from '@/access/roles'

const assertCanPublish = (data: Record<string, unknown> | undefined, user: unknown) => {
  if (data?._status === 'published' && user && !isEditorUser(user as never)) {
    throw new APIError('Only editors or admins can publish. Save as draft instead.', 403, null, true)
  }
}

/** Translators may save drafts but never publish. */
export const guardPublishing: CollectionBeforeChangeHook = ({ data, req }) => {
  assertCanPublish(data, req.user)
  return data
}

export const guardGlobalPublishing: GlobalBeforeChangeHook = ({ data, req }) => {
  assertCanPublish(data, req.user)
  return data
}
