import type { Payload } from 'payload'

import { readApprovalState } from '@/lib/approval-basis'
import type { Locale } from '@/i18n/locales'

/**
 * What the Admin button sends when a signed-in user approves the Home Page: the server-computed
 * basis of the stored draft the user is looking at (see src/lib/approval-basis.ts).
 */
export const homeApprovalContext = async (payload: Payload, locale: Locale) => ({
  approvalBasis: (await readApprovalState(payload, locale)).basis,
})
