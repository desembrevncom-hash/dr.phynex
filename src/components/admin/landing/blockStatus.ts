'use client'

import { useLocale } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

import { blockIssues, type LandingBlockType } from '@/lib/landing'

import { chosen, useProductProvides } from '../landingProvides'

const mediaId = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v)

/** Whether the block's own image is cleared for publication (null while unknown / no image). */
export function useImageReleased(value: unknown): boolean | null {
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

export type BlockStatus = { cls: string; text: string; short: string }

/** What one block still lacks in the language being edited (same rules as the site). */
export function useBlockStatus(data: Record<string, unknown> | undefined): BlockStatus {
  const { code } = useLocale()
  const provides = useProductProvides()
  const released = useImageReleased(data?.image)
  const type = data?.blockType as LandingBlockType | undefined
  const { required, optional } = data ? blockIssues(data, provides, chosen) : { required: [], optional: [] }
  if (released === false) {
    // The image is chosen but private: visitors would not see it.
    if (type === 'band' || type === 'split') required.push('ảnh được phép công khai')
    else optional.push('ảnh được phép công khai')
  }
  const lang = String(code ?? '').toUpperCase()
  if (data?.hidden) return { cls: 'dx-lp--hidden', text: 'Đang ẩn', short: 'Đang ẩn' }
  if (required.length > 0)
    return { cls: 'dx-lp--missing', text: `Khách chưa thấy (${lang}): thiếu ${required.join(', ')}`, short: `Khách chưa thấy (${lang})` }
  if (optional.length > 0)
    return { cls: 'dx-lp--partial', text: `Hiển thị (${lang}); nên bổ sung ${optional.join(', ')}`, short: `Nên bổ sung (${lang})` }
  return { cls: 'dx-lp--ok', text: `Đủ nội dung (${lang})`, short: `Đủ nội dung (${lang})` }
}
