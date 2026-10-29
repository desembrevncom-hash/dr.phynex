export const pageNumber = (value: string | undefined) => value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) : 1
export const journalSearch = (topic?: string, page = 1) => {
 const qs = new URLSearchParams()
 if (topic) qs.set('topic', topic)
 if (page > 1) qs.set('page', String(page))
 return qs.size ? '?' + qs.toString() : ''
}
