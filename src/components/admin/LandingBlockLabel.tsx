'use client'

import { useRowLabel } from '@payloadcms/ui'

import { blockTitles, type LandingBlockType } from '@/lib/landing'

import { useBlockStatus } from './landing/blockStatus'

/**
 * Header of one landing block (collapsed or open): block kind, its number and what it still lacks
 * in the language being edited, so missing text or images are visible without opening each block.
 */
export function LandingBlockLabel() {
  const { data, rowNumber } = useRowLabel<Record<string, unknown>>()
  const state = useBlockStatus(data)
  const type = data?.blockType as LandingBlockType | undefined
  const title = (type && blockTitles[type]) || 'Khối'
  return (
    <span className="dx-lp-label">
      <strong>
        {typeof rowNumber === 'number' ? `${rowNumber + 1}. ` : ''}
        {title}
      </strong>
      <span className={`dx-lp-badge ${state.cls}`}>{state.text}</span>
    </span>
  )
}
