import { isDeepStrictEqual } from 'node:util'
import {
  APIError,
  type CollectionBeforeChangeHook,
  type GlobalBeforeChangeHook,
  type Field,
} from 'payload'
import { isEditorUser } from '@/access/roles'

type Data = Record<string, unknown>
/** Compare only submitted localized content, including nested groups and SEO. */
function localizedChanged(fields: Field[], incoming: Data, original: Data): boolean {
  return fields.some((field) => {
    if ('name' in field && field.name === 'translationStatus') return false
    if ('name' in field && field.name in incoming) {
      const next = incoming[field.name],
        previous = original[field.name]
      if ('localized' in field && field.localized) return !isDeepStrictEqual(next, previous)
      if ('fields' in field && next && typeof next === 'object' && !Array.isArray(next)) {
        return localizedChanged(field.fields, next as Data, (previous ?? {}) as Data)
      }
    }
    if (!('name' in field) && 'fields' in field)
      return localizedChanged(field.fields, incoming, original)
    if ('tabs' in field)
      return field.tabs.some((tab) => localizedChanged(tab.fields, incoming, original))
    return false
  })
}
function hasLocalizedContent(fields: Field[], original: Data): boolean {
  const meaningful = (value: unknown): boolean => {
    if (value == null || value === '') return false
    if (Array.isArray(value)) return value.some(meaningful)
    if (typeof value === 'object') return Object.values(value).some(meaningful)
    return true
  }
  return fields.some((field) => {
    if ('name' in field) {
      if (field.name === 'translationStatus') return false
      if ('localized' in field && field.localized) return meaningful(original[field.name])
      if ('fields' in field)
        return hasLocalizedContent(field.fields, (original[field.name] ?? {}) as Data)
    } else if ('fields' in field) return hasLocalizedContent(field.fields, original)
    if ('tabs' in field) return field.tabs.some((tab) => hasLocalizedContent(tab.fields, original))
    return false
  })
}
function review(
  data: Data,
  original: Data | undefined,
  fields: Field[],
  user: unknown,
  savingDraft: unknown,
  approvalIntent: unknown,
) {
  if (data._status === 'published' && user && !isEditorUser(user as never)) {
    throw new APIError(
      'Only editors or admins can publish. Save as draft instead.',
      403,
      null,
      true,
    )
  }
  // The first locale revision can be approved on creation. Every subsequent content
  // edit must be saved first, then approved in a separate request without content edits.
  const hasRevision =
    original != null &&
    (original.translationStatus === 'approved' || hasLocalizedContent(fields, original))
  const changed = hasRevision && localizedChanged(fields, data, original!)
  if (changed && !savingDraft) {
    throw new APIError(
      'Save content changes as a draft before review and publication.',
      409,
      null,
      true,
    )
  }
  if (changed) data.translationStatus = 'in-review'
  const approval = data.translationStatus ?? original?.translationStatus
  // A full admin form repeats In review when Publish is clicked. Only a real
  // Approved -> lower-review transition is an intentional approval withdrawal.
  const withdrawal = !changed && original?.translationStatus === 'approved' &&
    (approvalIntent === 'in-review' || approvalIntent === 'ai-draft')
  if (data._status === 'published' && (changed || (approval !== 'approved' && !withdrawal))) {
    throw new APIError(
      'Save the draft and review it before publishing this locale.',
      409,
      null,
      true,
    )
  }
  return data
}
export const guardPublishing: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  collection,
  req,
  operation,
}) =>
  review(
    data,
    operation === 'create' ? undefined : originalDoc,
    collection.fields,
    req.user,
    req.context.reviewSavingDraft,
    req.context.reviewApprovalIntent,
  )
export const guardGlobalPublishing: GlobalBeforeChangeHook = ({ data, originalDoc, global, req }) =>
  review(
    data,
    originalDoc,
    global.fields,
    req.user,
    req.context.reviewSavingDraft,
    req.context.reviewApprovalIntent,
  )
