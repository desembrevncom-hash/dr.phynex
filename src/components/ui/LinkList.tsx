import Link from 'next/link'

type Item = { id: number | string; href: string; title: string; description?: string | null }

export function LinkList({ items }: { items: Item[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={item.href} className="block py-4 hover:bg-surface-muted">
            <span className="font-medium">{item.title}</span>
            {item.description ? <span className="mt-1 block text-sm text-ink-muted">{item.description}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Filter chips rendered as plain links (works without JavaScript). */
export function FilterLinks({
  label,
  options,
}: {
  label: string
  options: { href: string; label: string; active: boolean }[]
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink-muted">{label}</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <li key={o.href}>
            <Link
              href={o.href}
              aria-current={o.active ? 'true' : undefined}
              className="inline-block rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-ink aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-surface"
            >
              {o.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
