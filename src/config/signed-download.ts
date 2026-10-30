import { GetObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getStorageFilePath, sanitizePrefix } from '@payloadcms/plugin-cloud-storage/utilities'
import type { CollectionConfig, PayloadRequest } from 'payload'

/**
 * Staff-only downloads of large private files (Source documents, PDFs of 6-8 MB) on Vercel,
 * where a function cannot return more than 4.5 MB.
 *
 * Payload's file route checks read access (`staff`) BEFORE any upload handler runs; anonymous
 * and non-staff requests never reach this handler. When read access is plain `true` Payload does
 * not look the file up, so this handler loads the record itself, with the caller's own access
 * (overrideAccess: false). No record, or more than one record for the filename → nothing is
 * signed. It then answers with a 302 to a presigned GET URL that:
 * - is valid for SIGNED_DOWNLOAD_SECONDS only;
 * - names exactly the object the storage plugin stored for that record: the key comes from the
 *   plugin's own resolver (`getStorageFilePath`), so `prefix/_objectKey/filename` for client
 *   uploads and `prefix/filename` for files without an `_objectKey` (null or ""), never from
 *   the request;
 * - makes the bucket reply with no-store caching and an inline PDF disposition.
 * The 302 itself is never cached and the URL is never logged. The bucket stays private and no
 * credential reaches the browser (a presigned URL carries the access key ID and a signature,
 * not the secret).
 *
 * Limitation: a presigned URL cannot be revoked; anyone holding it can use it until it expires.
 * Removing a user's role stops new URLs immediately, not one issued seconds earlier.
 */
export const SIGNED_DOWNLOAD_SECONDS = 60

type Doc = { filename?: unknown; prefix?: unknown; _objectKey?: unknown; mimeType?: unknown }
type HandlerArgs = {
  doc: unknown
  params: { clientUploadContext?: unknown; collection: string; filename: string; prefix?: string }
}
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

/** A plain file name: no path separators, no traversal, no control characters. */
const isPlainFilename = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value !== '.' &&
  value !== '..' &&
  !/[/\\]/.test(value) &&
  ![...value].some((char) => char.charCodeAt(0) < 0x20)

/**
 * Object key exactly as the storage plugin resolves it for this stored record (same function the
 * S3 adapter uses when it reads the file), constrained to the collection prefix.
 */
export async function resolveObjectKey({
  collection,
  collectionPrefix,
  doc,
  req,
}: {
  collection: CollectionConfig
  collectionPrefix: string
  doc: Doc
  req: PayloadRequest
}): Promise<string | null> {
  if (!isPlainFilename(doc.filename)) return null
  const key = await getStorageFilePath({
    collection: collection as never,
    collectionPrefix,
    doc: doc as never,
    filename: doc.filename,
    req,
    useCompositePrefixes: false,
  })
  const root = sanitizePrefix(collectionPrefix)
  return root && !key.startsWith(`${root}/`) ? null : key
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

const empty = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'private, no-store' } })

/**
 * Stored records for this filename (and `?prefix=` when given), read with the caller's own
 * access rights. Two are fetched so an ambiguous filename is detected instead of guessed.
 */
async function findAuthorized(req: PayloadRequest, collection: string, filename: string, prefix?: string): Promise<Doc[]> {
  const prefixFilter = typeof prefix === 'string' && prefix ? [{ prefix: { equals: sanitizePrefix(prefix) } }] : []
  const { docs } = await req.payload.find({
    collection: collection as 'source-documents',
    where: { and: [{ filename: { equals: filename } }, ...prefixFilter] },
    limit: 2,
    depth: 0,
    pagination: false,
    overrideAccess: false,
    req,
  })
  return docs as Doc[]
}

export function signedDownloadHandler({ bucket, prefix, sign }: { bucket: string; prefix: string; sign: Signer }) {
  const redirect = async (req: PayloadRequest, given: unknown, params: HandlerArgs['params']): Promise<Response> => {
    if (!isPlainFilename(params.filename)) return empty(404)
    let doc = given as Doc | undefined
    if (!doc) {
      const found = await findAuthorized(req, params.collection, params.filename, params.prefix)
      if (found.length === 0) return empty(404)
      // Never pick one of several objects that share a filename.
      if (found.length > 1) return empty(409)
      doc = found[0]
    }
    if (doc.filename !== params.filename) return empty(404)
    const collection = req.payload.collections[params.collection as 'source-documents']?.config
    if (!collection) return empty(404)
    const key = await resolveObjectKey({ collection, collectionPrefix: prefix, doc, req })
    if (!key) return empty(404)
    const url = await sign({
      bucket,
      key,
      filename: params.filename,
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
