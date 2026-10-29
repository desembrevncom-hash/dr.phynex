'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

type Item = { key: string; label: string; href: string; current: boolean }

/** Disclosure menu below 1024px: Esc closes and returns focus to the button. */
export function MobileMenu({
  items,
  menuLabel,
  closeLabel,
  navLabel,
  footer,
}: {
  items: Item[]
  menuLabel: string
  closeLabel: string
  navLabel: string
  footer: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 rounded px-3 text-sm font-medium text-navy"
      >
        <span aria-hidden="true" className="relative block h-3 w-4">
          <span
            className={`absolute left-0 h-0.5 w-4 bg-current transition-transform duration-200 ${open ? 'top-1.5 rotate-45' : 'top-0'}`}
          />
          <span
            className={`absolute left-0 h-0.5 w-4 bg-current transition-transform duration-200 ${open ? 'top-1.5 -rotate-45' : 'top-2.5'}`}
          />
        </span>
        {open ? closeLabel : menuLabel}
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 border-b border-line bg-surface shadow-[0_12px_24px_-16px_rgb(0_42_82/0.25)]"
      >
        <nav aria-label={navLabel} className="container-page py-4">
          <ul>
            {items.map((item) => (
              <li key={item.key} className="border-b border-line last:border-b-0">
                <Link
                  href={item.href}
                  aria-current={item.current ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center text-base text-ink aria-[current=page]:font-semibold aria-[current=page]:text-navy"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-navy pt-4">{footer}</div>
        </nav>
      </div>
    </div>
  )
}
