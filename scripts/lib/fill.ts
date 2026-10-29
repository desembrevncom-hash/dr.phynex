/**
 * Fill-only helpers for the import scripts. An import never overwrites a value someone has
 * already entered or edited, never touches a published or approved document, and never
 * changes `_status` or an existing `translationStatus`.
 */

/** Empty = nothing an editor could have written: null, '', [], or rich text without any text. */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object' && 'root' in (value as object)) {
    return !/"text":"[^"\s]/.test(JSON.stringify(value))
  }
  return false
}

/** Keeps only the candidate fields that have a value and whose current value is empty. */
export function onlyEmpty(current: Record<string, unknown> | undefined, candidate: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(candidate)) {
    if (isEmpty(value)) continue
    if (!current || isEmpty(current[key])) out[key] = value
  }
  return out
}

/** A document is locked for imports once it is published or any language is approved. */
export function isLocked(perLocale: Array<{ _status?: string | null; translationStatus?: string | null } | undefined>) {
  return perLocale.some((d) => d?._status === 'published' || d?.translationStatus === 'approved')
}
