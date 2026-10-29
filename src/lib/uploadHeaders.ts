export function privateUploadHeaders({ headers }: { headers: Headers }) {
 headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
 headers.append('Vary', 'Cookie, Authorization')
 return headers
}
