import type { ReactNode } from 'react'

/** Page opening for content pages: navy rule, h1, optional lead and side slot (DESIGN.md §5). */
export function PageIntro({ title, lead, aside }: { title: ReactNode; lead?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="container-page pt-8 lg:pt-14">
      <div className="grid gap-4 border-t border-navy pt-6 md:grid-cols-12 md:gap-8">
        <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-navy sm:text-4xl md:col-span-7 lg:text-5xl">
          {title}
        </h1>
        {lead || aside ? (
          <div className="text-base text-ink-muted md:col-span-5 md:pt-2 lg:text-lg">
            {lead ? <div>{lead}</div> : null}
            {aside ? <div className={lead ? 'mt-4' : ''}>{aside}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
