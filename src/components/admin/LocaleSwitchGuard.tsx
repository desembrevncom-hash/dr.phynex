'use client'

import { useFormModified, useLocale } from '@payloadcms/ui'
import { useEffect } from 'react'

/**
 * Payload's language switcher (document header) reloads the document in the new language, which
 * silently drops unsaved edits. Ask first when the form has unsaved changes.
 */
export function LocaleSwitchGuard() {
  const modified = useFormModified()
  const { code } = useLocale()
  useEffect(() => {
    if (!modified) return
    const onClick = (e: MouseEvent) => {
      // The language list opens in a popup (portal); its items carry the locale code.
      const button = (e.target as HTMLElement | null)?.closest('.popup-button-list__button')
      if (!button || !button.querySelector('.localizer__locale-code')) return
      if (button.classList.contains('popup-button-list__button--selected')) return
      const ok = window.confirm(
        `Có thay đổi chưa lưu ở ${String(code ?? '').toUpperCase()}. Đổi ngôn ngữ bây giờ sẽ bỏ các thay đổi này.\n\nBấm OK để đổi và bỏ thay đổi, hoặc Huỷ để ở lại rồi bấm "Lưu nháp".`,
      )
      if (!ok) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [modified, code])
  return null
}
