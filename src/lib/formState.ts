// Shared by server actions and client forms (no server-only imports here).
export type FieldErrorCode = 'required' | 'email' | 'tooLong' | 'consent'

export type FormState = {
  status: 'idle' | 'success' | 'error'
  /** Top-level error: invalid input, rate limit or server failure. */
  code?: 'invalid' | 'rateLimited' | 'server'
  errors?: Record<string, FieldErrorCode>
  values?: Record<string, string>
  /**
   * Random id issued only when a submission was actually stored. Drives the generate_lead
   * analytics event (and its vendor event_id) exactly once; contains no form data.
   */
  leadId?: string
}

export const initialFormState: FormState = { status: 'idle' }
