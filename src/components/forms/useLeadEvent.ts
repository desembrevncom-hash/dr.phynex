'use client'

import { useEffect } from 'react'

import { trackEvent } from '@/lib/analytics/client'
import type { LeadForm } from '@/lib/analytics/events'
import type { FormState } from '@/lib/formState'

/**
 * Reports generate_lead after the server confirmed a stored submission (a leadId is present).
 * Errors, validation failures and button clicks never count; the tracker dedupes by leadId,
 * so re-renders and Strict Mode cannot send it twice. No form field is passed on.
 */
export function useLeadEvent(form: LeadForm, state: FormState) {
  const leadId = state.status === 'success' ? state.leadId : undefined
  useEffect(() => {
    if (leadId) trackEvent({ name: 'generate_lead', form, leadId })
  }, [form, leadId])
}
