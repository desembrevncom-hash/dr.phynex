import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { Arrow } from './Arrow'

type EmptyLink = { href: string; title: string; body?: string }

/**
 * Shown when a page has nothing published + approved in this locale yet. Visitors get a neutral
 * message and ways onward; nothing here stands in for real content.
 */
export async function EmptyState({ title, body, links = [] }: { title?: string; body?: string; links?: EmptyLink[] }) {
  const t = await getTranslations('empty')
  return (
    <section role="status" className="grid gap-8 rounded-lg bg-surface-muted p-6 sm:p-10 md:grid-cols-12 md:gap-8">
      <div className={links.length > 0 ? 'md:col-span-6' : 'md:col-span-12'}>
        <h2 className="text-xl font-bold text-navy lg:text-2xl">{title ?? t('title')}</h2>
        <p className="mt-3 max-w-prose text-ink-muted">{body ?? t('body')}</p>
      </div>
      {links.length > 0 ? (
        <ul className="border-t border-navy md:col-span-6">
          {links.map((link) => (
            <li key={link.href} className="border-b border-line">
              <Link href={link.href} className="group flex items-start justify-between gap-4 py-5">
                <span>
                  <span className="block font-semibold text-navy">{link.title}</span>
                  {link.body ? <span className="mt-1 block text-sm text-ink-muted">{link.body}</span> : null}
                </span>
                <span className="mt-1 text-navy">
                  <Arrow />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
