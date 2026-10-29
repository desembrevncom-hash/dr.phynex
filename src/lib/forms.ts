import 'server-only'

import type { FieldErrorCode } from './formState'

export type { FormState } from './formState'

type FieldRule = { required?: boolean; max: number; email?: boolean; options?: readonly string[] }

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Validates text fields and the consent checkbox. Returns trimmed values + per-field error codes. */
export function validate(formData: FormData, rules: Record<string, FieldRule>) {
  const values: Record<string, string> = {}
  const errors: Record<string, FieldErrorCode> = {}

  for (const [name, rule] of Object.entries(rules)) {
    const raw = formData.get(name)
    const value = typeof raw === 'string' ? raw.trim() : ''
    values[name] = value
    if (!value) {
      if (rule.required) errors[name] = 'required'
      continue
    }
    if (value.length > rule.max) errors[name] = 'tooLong'
    else if (rule.email && !emailPattern.test(value)) errors[name] = 'email'
    else if (rule.options && !rule.options.includes(value)) errors[name] = 'required'
  }

  if (formData.get('consent') === 'on') values.consent = 'on'
  else errors.consent = 'consent'
  return { values, errors, ok: Object.keys(errors).length === 0 }
}

/** Honeypot: real visitors never see or fill this field. */
export const isBot = (formData: FormData) => {
  const trap = formData.get('website')
  return typeof trap === 'string' && trap.trim().length > 0
}

// Basic in-memory rate limit (per server instance). On serverless hosting this is
// best-effort only; replace with a shared store (e.g. Postgres/KV) before launch.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()

export function rateLimited(key: string, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k)
  }
  return recent.length > MAX_PER_WINDOW
}
