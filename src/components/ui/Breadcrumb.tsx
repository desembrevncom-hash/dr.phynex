import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

/** Trail of parent pages; the last item is the current page (aria-current). */
export async function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  const t = await getTranslations('common')
  return (
    <nav aria-label={t('breadcrumb')} className="container-page pt-6 lg:pt-10">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link href={item.href} className="hover:text-navy hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
