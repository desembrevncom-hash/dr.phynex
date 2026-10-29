import Link from 'next/link'

/** Filter as plain links (works without JavaScript); the active one carries aria-current. */
export function FilterTabs({
  label,
  options,
}: {
  label: string
  options: { href: string; label: string; active: boolean }[]
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-x-1 border-b border-line">
        {options.map((o) => (
          <li key={o.href}>
            <Link
              href={o.href}
              aria-current={o.active ? 'page' : undefined}
              className="relative inline-flex min-h-12 items-center px-4 text-sm font-semibold text-ink-muted transition-colors after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-navy after:opacity-0 hover:text-navy aria-[current=page]:text-navy aria-[current=page]:after:opacity-100"
            >
              {o.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
