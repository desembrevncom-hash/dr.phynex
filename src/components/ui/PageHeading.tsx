import type { ReactNode } from 'react'

export function PageHeading({ children, intro }: { children: ReactNode; intro?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{children}</h1>
      {intro ? <p className="mt-3 max-w-prose text-lg text-ink-muted">{intro}</p> : null}
    </div>
  )
}
