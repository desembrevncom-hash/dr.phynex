'use client'

import { useFormFields, useLocale } from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'

type Media = { url?: string | null; thumbnailURL?: string | null; alt?: string | null }
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Header of one banner slot (collapsible label): name, headline, small preview. Read-only. */
export function SlotLabel({ slot, title }: { slot: string; title: string }) {
  const { code } = useLocale()
  const path = (name: string) => `banners.${slot}.${name}`
  const visualType = useFormFields(([fields]) => fields[path('visualType')]?.value)
  const sharedImage = useFormFields(([fields]) => fields[path('desktopImage')]?.value)
  const localeImage = useFormFields(([fields]) => fields[path('localeDesktopImage')]?.value)
  const headline = text(useFormFields(([fields]) => fields[path('title')]?.value))
  const imageAlt = text(useFormFields(([fields]) => fields[path('imageAlt')]?.value))
  const chosen = visualType === 'fullBleed' && localeImage ? localeImage : sharedImage
  const mediaId = chosen && typeof chosen === 'object' ? (chosen as { id?: unknown }).id : chosen
  const [media, setMedia] = useState<Media | null>(null)

  useEffect(() => {
    if (visualType === 'brandOptics' || !mediaId) return
    const controller = new AbortController()
    fetch(`/api/media/${String(mediaId)}?depth=0&locale=${code}&fallback-locale=none`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<Media>) : null))
      .then(setMedia)
      .catch(() => undefined)
    return () => controller.abort()
  }, [mediaId, visualType, code])

  // Payload gives every accordion toggle the same generic name; name it after the banner and keep
  // aria-expanded in step so screen-reader and keyboard users can tell the five rows apart.
  const root = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const collapsible = root.current?.closest('.collapsible')
    const toggle = collapsible?.querySelector('button.collapsible__toggle')
    if (!collapsible || !toggle) return
    toggle.setAttribute('aria-label', `Mở hoặc đóng ${title}`)
    const sync = () =>
      toggle.setAttribute(
        'aria-expanded',
        String(!collapsible.classList.contains('collapsible--collapsed')),
      )
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(collapsible, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [title])

  const showing = visualType !== 'brandOptics' && !!mediaId
  const src = showing ? media?.thumbnailURL || media?.url || null : null
  const alt = imageAlt || (showing ? text(media?.alt) : '') || `Ảnh banner ${title}`

  return (
    <span className="dx-slot" ref={root}>
      <span className="dx-slot__thumb">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} width={64} height={40} loading="lazy" />
        ) : (
          <span className="dx-slot__none">
            {visualType === 'brandOptics' ? 'Visual có sẵn' : mediaId ? '…' : 'Chưa có ảnh'}
          </span>
        )}
      </span>
      <span className="dx-slot__text">
        <strong>{title}</strong>
        <span className="dx-slot__sub">{headline || 'Dùng nội dung mặc định của website'}</span>
      </span>
    </span>
  )
}
