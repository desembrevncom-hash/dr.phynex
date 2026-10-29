import { APIError, type Field } from 'payload'

import { isEditorUser } from '@/access/roles'

export const translationStatuses = ['ai-draft', 'in-review', 'approved'] as const

/**
 * Per-locale review state. The public site only shows a locale when the
 * document is published AND this field is `approved` for that locale.
 * Only editors/admins may move a locale to `approved`.
 */
export const translationStatusField: Field = {
  name: 'translationStatus',
  type: 'select',
  localized: true,
  required: true,
  defaultValue: 'in-review',
  index: true,
  options: [
    { label: 'AI draft', value: 'ai-draft' },
    { label: 'In review', value: 'in-review' },
    { label: 'Approved', value: 'approved' },
  ],
  admin: {
    position: 'sidebar',
    description:
      'Per language. Content changes reset approval, including editor changes. Save the draft first, review it, set Approved in a separate save without content edits, then publish this language.',
  },
  hooks: {
    beforeChange: [
      ({ value, previousValue, req }) => {
        if (
          value === 'approved' &&
          previousValue !== 'approved' &&
          req.user &&
          !isEditorUser(req.user)
        ) {
          throw new APIError('Only editors or admins can approve a translation.', 403, null, true)
        }
        // A translator's draft is a new revision, never the previously approved text.
        if (previousValue === 'approved' && req.user && !isEditorUser(req.user)) return 'in-review'
        return value
      },
    ],
  },
}
