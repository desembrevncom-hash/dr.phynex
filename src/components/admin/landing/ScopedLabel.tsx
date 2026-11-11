'use client'

import { FieldLabel } from '@payloadcms/ui'
import type { StaticLabel } from 'payload'

type Props = {
  field?: { label?: StaticLabel | false; localized?: boolean; required?: boolean; type?: string }
  path?: string
}

/**
 * Label of a landing block field with its scope right next to it: "Riêng ngôn ngữ" (text typed
 * per language) or "Dùng chung KO/EN/VI" (structure: order, hide, images, colour, layout, rows).
 */
export function ScopedLabel({ field, path }: Props) {
  const local = field?.localized === true
  return (
    <span className="dx-scope-label">
      <FieldLabel label={field?.label || undefined} localized={local} path={path} required={field?.required} />
      <span className={`dx-scope ${local ? 'dx-scope--local' : 'dx-scope--shared'}`}>
        {local ? 'Riêng ngôn ngữ' : 'Dùng chung KO/EN/VI'}
      </span>
    </span>
  )
}
