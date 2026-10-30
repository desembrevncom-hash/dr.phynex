import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbLd } from '@/lib/structured-data'

/** Trail of parent pages; the last item is the current page (aria-current). Also emits BreadcrumbList. */
export async function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  const t = await getTranslations('common')
  return (
    <nav aria-label={t('breadcrumb')} className="container-page pt-6 lg:pt-10">
      <JsonLd data={breadcrumbLd(items.map((item) => ({ name: item.label, path: item.href })))} />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex min-w-0 max-w-full items-center gap-2">
            {i > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link href={item.href} className="truncate hover:text-navy hover:underline">
                {item.label}
              </Link>
            ) : (
              // Long article titles stay on one line here; the full title is the page h1.
              <span aria-current="page" className="truncate text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
