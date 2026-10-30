import { serializeJsonLd } from '@/lib/structured-data'

/** Server-rendered structured data; content is escaped by serializeJsonLd. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
}
