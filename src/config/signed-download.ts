import { GetObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { PayloadRequest } from 'payload'

/**
 * Staff-only downloads of large private files (Source documents, PDFs of 6-8 MB) on Vercel,
 * where a function cannot return more than 4.5 MB.
 *
 * Payload's file route checks read access (`staff`) BEFORE any upload handler runs; anonymous
 * and non-staff requests never reach this handler. When read access is plain `true` Payload does
 * not look the file up, so this handler loads the record itself, with the caller's own access
 * (overrideAccess: false). No record → 404 and nothing is signed. It then answers with a 302 to
 * a presigned GET URL that:
 * - is valid for SIGNED_DOWNLOAD_SECONDS only;
 * - names exactly the object stored for the authorized document (key from the DB record, not
 *   from the request);
 * - makes the bucket reply with no-store caching and an inline PDF disposition.
 * The 302 itself is never cached and the URL is never logged. The bucket stays private and no
 * credential reaches the browser (a presigned URL carries the access key ID and a signature,
 * not the secret).
 *
 * Limitation: a presigned URL cannot be revoked; anyone holding it can use it until it expires.
 * Removing a user's role stops new URLs immediately, not one issued seconds earlier.
 */
export const SIGNED_DOWNLOAD_SECONDS = 60

type Doc = { filename?: unknown; prefix?: unknown; mimeType?: unknown }
type HandlerArgs = { doc: unknown; params: { clientUploadContext?: unknown; collection: string; filename: string } }
export type Signer = (input: { bucket: string; key: string; filename: string; mimeType?: string; expiresIn: number }) => Promise<string>

export const noStoreRedirectHeaders = (location: string) =>
  new Headers({
    Location: location,
    'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Referrer-Policy': 'no-referrer',
    Vary: 'Cookie, Authorization',
    'X-Content-Type-Options': 'nosniff',
  })

const safeSegment = (value: unknown) =>
  typeof value === 'string' && value.length > 0 && !value.includes('..') && !value.startsWith('/') && !value.includes('\\')
    ? value
    : null

/** Object key for an authorized document, from its stored record only. */
export function objectKey(doc: Doc, defaultPrefix: string): string | null {
  const filename = safeSegment(doc.filename)
  if (!filename) return null
  const prefix = doc.prefix === undefined || doc.prefix === null || doc.prefix === '' ? defaultPrefix : safeSegment(doc.prefix)
  if (prefix === null) return null
  return prefix ? `${prefix.replace(/\/+$/, '')}/${filename}` : filename
}

export function s3Signer(config: S3ClientConfig): Signer {
  const client = new S3Client(config)
  return ({ bucket, key, filename, mimeType, expiresIn }) =>
    getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseCacheControl: 'private, no-store, max-age=0',
        ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
        ...(mimeType ? { ResponseContentType: mimeType } : {}),
      }),
      { expiresIn },
    )
}

const notFound = () => new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })

/** The stored record for this filename, read with the caller's own access rights. */
async function findAuthorized(req: PayloadRequest, collection: string, filename: string): Promise<Doc | undefined> {
  const { docs } = await req.payload.find({
    collection: collection as 'source-documents',
    where: { filename: { equals: filename } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: false,
    req,
  })
  return docs[0] as Doc | undefined
}

export function signedDownloadHandler({ bucket, prefix, sign }: { bucket: string; prefix: string; sign: Signer }) {
  const redirect = async (req: PayloadRequest, given: unknown, params: HandlerArgs['params']): Promise<Response> => {
    const doc = (given as Doc | undefined) ?? (await findAuthorized(req, params.collection, params.filename))
    if (!doc) return notFound()
    const key = objectKey(doc, prefix)
    if (!key || doc.filename !== params.filename) return notFound()
    const url = await sign({
      bucket,
      key,
      filename: doc.filename as string,
      mimeType: typeof doc.mimeType === 'string' ? doc.mimeType : undefined,
      expiresIn: SIGNED_DOWNLOAD_SECONDS,
    })
    return new Response(null, { status: 302, headers: noStoreRedirectHeaders(url) })
  }
  return (req: PayloadRequest, { doc, params }: HandlerArgs): Promise<Response> | void => {
    // Payload's own server-side read of a just-uploaded client file: let the storage adapter
    // stream it as usual (no redirect).
    if (params.clientUploadContext) return
    return redirect(req, doc, params)
  }
}
