/**
 * "View as guest" in the staff preview: the same draft data, but every Media file that is not
 * released for publication is reduced to its id, exactly as visitors receive it from the API.
 * Blocks then hide their private images and, when nothing else is left, disappear entirely.
 */
const isMedia = (v: Record<string, unknown>) => typeof v.filename === 'string' && 'mimeType' in v

export function asGuestView<T>(value: T): T {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      if (isMedia(o)) return o.publicRelease === true ? o : (o.id ?? null)
      return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, walk(x)]))
    }
    return v
  }
  return walk(value) as T
}
