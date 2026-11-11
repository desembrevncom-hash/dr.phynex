'use client'

import { useFormFields } from '@payloadcms/ui'

export type LandingRowData = Record<string, unknown> & { blockType?: string; hidden?: boolean; id?: string }

/**
 * Each landing block's current data (unsaved edits included), rebuilt from the flat form state
 * ("landing.<i>.<field>", array rows as "landing.<i>.items.<n>.<field>").
 */
export function useLandingRows(path = 'landing'): LandingRowData[] {
  return useFormFields(([fields]) => {
    const out: LandingRowData[] = []
    const prefix = `${path}.`
    for (const [key, field] of Object.entries(fields)) {
      if (!key.startsWith(prefix)) continue
      const [index, ...parts] = key.slice(prefix.length).split('.')
      if (!/^[0-9]+$/.test(index) || parts.length === 0) continue
      const i = Number(index)
      out[i] ??= {}
      // "<i>.items" holds the row count; the rows themselves come as "items.<n>.<field>".
      if (parts.length === 1 && !Array.isArray(out[i][parts[0]])) out[i][parts[0]] = field.value
      else if (parts.length === 3) {
        if (!Array.isArray(out[i][parts[0]])) out[i][parts[0]] = []
        const list = out[i][parts[0]] as Record<string, unknown>[]
        list[Number(parts[1])] ??= {}
        list[Number(parts[1])][parts[2]] = field.value
      }
    }
    return Array.from(out, (r) => r ?? {})
  })
}
