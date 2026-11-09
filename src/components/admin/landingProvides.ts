'use client'

import { useFormFields } from '@payloadcms/ui'

import type { ProductProvides } from '@/lib/landing'

const hasValue = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== '')
const hasRich = (v: unknown) => /"text":"[^"\s]/.test(JSON.stringify(v ?? ''))

/** What the product form currently provides (unsaved edits included), in the language shown. */
export function useProductProvides(): ProductProvides {
  return useFormFields(([fields]) => ({
    image: hasValue(fields.images?.value),
    packSize: hasValue(fields.volume?.value),
    inci: hasValue(fields.inci?.value),
    howToUse: hasRich(fields.howToUse?.value),
    cautions: hasRich(fields.cautions?.value),
    keyIngredients: hasValue(fields.keyIngredients?.value),
  }))
}

/** In the form an upload is "chosen" as soon as it has a value (visibility is checked on the site). */
export const chosen = (v: unknown) => v !== null && v !== undefined && v !== ''
