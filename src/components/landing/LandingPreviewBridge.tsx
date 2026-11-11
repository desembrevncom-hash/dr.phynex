'use client'

import { useEffect } from 'react'

const PREVIEW_SOURCE = 'dx-lp-preview'
const BUILDER_SOURCE = 'dx-lp-builder'

/**
 * Staff preview inside the Admin landing builder only (the page is framed by /admin on the same
 * origin): a click on a block opens it in the builder, and the block selected there is outlined
 * here. Links inside blocks do not navigate the frame. Does nothing on a normal page.
 */
export function LandingPreviewBridge() {
  useEffect(() => {
    if (window.parent === window) return
    const origin = window.location.origin
    document.documentElement.classList.add('lp-builder-frame')
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-lp-id]')
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
      window.parent.postMessage({ source: PREVIEW_SOURCE, type: 'select', id: el.dataset.lpId }, origin)
    }
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.data?.source !== BUILDER_SOURCE || e.data.type !== 'focus') return
      document.querySelectorAll('[data-lp-selected]').forEach((n) => n.removeAttribute('data-lp-selected'))
      const target = Array.from(document.querySelectorAll<HTMLElement>('[data-lp-id]')).find((n) => n.dataset.lpId === e.data.id)
      if (!target) return
      target.setAttribute('data-lp-selected', '')
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('message', onMessage)
    // Tell the builder which view this frame really shows, so it can catch a stale frame.
    window.parent.postMessage(
      {
        source: PREVIEW_SOURCE,
        type: 'ready',
        view: new URLSearchParams(window.location.search).get('lp'),
        staffMarks: document.body.innerText.includes('[Xem trước]'),
      },
      origin,
    )
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('message', onMessage)
      document.documentElement.classList.remove('lp-builder-frame')
    }
  }, [])
  return null
}
