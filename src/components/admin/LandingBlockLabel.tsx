'use client'

import { useLocale, useRowLabel } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

import { blockIssues, blockTitles, type LandingBlockType } from '@/lib/landing'

import { chosen, useProductProvides } from './landingProvides'

const mediaId = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v)

/** Whether the block's own image is cleared for publication (null while unknown / no image). */
function useImageReleased(value: unknown): boolean | null {
  const id = chosen(value) ? mediaId(value) : null
  const [released, setReleased] = useState<boolean | null>(null)
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    fetch(`/api/media/${String(id)}?depth=0`, { credentials: 'include', signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ publicRelease?: boolean }>) : null))
      .then((m) => setReleased(m ? m.publicRelease === true : null))
      .catch(() => undefined)
    return () => controller.abort()
  }, [id])
  return id ? released : null
}

/**
 * Header of one landing block (collapsed or open): block kind, its number and what it still lacks
 * in the language being edited, so missing text or images are visible without opening each block.
 */
export function LandingBlockLabel() {
  const { data, rowNumber } = useRowLabel<Record<string, unknown>>()
  const { code } = useLocale()
  const provides = useProductProvides()
  const released = useImageReleased(data?.image)
  const type = data?.blockType as LandingBlockType | undefined
  const title = (type && blockTitles[type]) || 'Khối'
  const { required, optional } = data ? blockIssues(data, provides, chosen) : { required: [], optional: [] }
  if (released === false) {
    // The image is chosen but private: visitors would not see it.
    if (type === 'band' || type === 'split') required.push('ảnh được phép công khai')
    else optional.push('ảnh được phép công khai')
  }
  const lang = String(code ?? '').toUpperCase()
  const state = data?.hidden
    ? { cls: 'dx-lp--hidden', text: 'Đang ẩn' }
    : required.length > 0
      ? { cls: 'dx-lp--missing', text: `Khách chưa thấy (${lang}): thiếu ${required.join(', ')}` }
      : optional.length > 0
        ? { cls: 'dx-lp--partial', text: `Hiển thị (${lang}); nên bổ sung ${optional.join(', ')}` }
        : { cls: 'dx-lp--ok', text: `Đủ nội dung (${lang})` }
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
