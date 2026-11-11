import { getTranslations } from 'next-intl/server'

import type { ContactRow } from '@/lib/contact-details'

/**
 * The same contact rows on the Contact page (light) and in the footer (dark). Email opens the mail
 * app, the hotline starts a call; hours and address keep their line breaks from the CMS.
 */
export async function ContactDetailsList({ rows, variant }: { rows: ContactRow[]; variant: 'page' | 'footer' }) {
  const t = await getTranslations('contact')
  if (rows.length === 0) return null
  const footer = variant === 'footer'
  // Footer band (owner's reference): address first, then hotline, email and hours on one line.
  const footerOrder: ContactRow['key'][] = ['address', 'phone', 'email', 'hours']
  const shown = footer ? [...rows].sort((a, b) => footerOrder.indexOf(a.key) - footerOrder.indexOf(b.key)) : rows
  return (
    <dl className={footer ? 'site-footer-contact' : 'border-t border-line text-sm'}>
      {shown.map((row) => (
        <div key={row.key} data-key={row.key} className={footer ? undefined : 'border-b border-line py-3'}>
          <dt className={footer ? undefined : 'text-ink-muted'}>{t(row.key)}</dt>
          <dd className={footer ? undefined : 'mt-1 whitespace-pre-line font-medium text-ink'}>
            {'href' in row ? (
              <a
                href={row.href}
                className={footer ? undefined : 'text-navy underline underline-offset-2'}
                {...(row.key === 'phone' ? { dir: 'ltr' } : {})}
              >
                {row.value}
              </a>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
