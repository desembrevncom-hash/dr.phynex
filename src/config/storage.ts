import type { S3ClientConfig } from '@aws-sdk/client-s3'
import { s3Storage } from '@payloadcms/storage-s3'
import type { Plugin } from 'payload'

import { isEditorUser } from '@/access/roles'

import { s3Signer, signedDownloadHandler } from './signed-download'

/** S3/R2 connection from the environment, or null when object storage is off (local disk). */
export function storageSettings(): { bucket: string; config: S3ClientConfig } | null {
  const bucket = process.env.S3_BUCKET
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
  if (!bucket || !accessKeyId || !secretAccessKey) return null
  return {
    bucket,
    config: {
      // R2: region "auto" and the account endpoint (https://<account-id>.r2.cloudflarestorage.com).
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: { accessKeyId, secretAccessKey },
    },
  }
}

export const SOURCE_DOCUMENTS_PREFIX = 'source-documents'

/**
 * Upload handlers for Source documents: with object storage, staff downloads are short-lived
 * presigned redirects (files exceed Vercel's 4.5 MB response limit). Local disk: none, Payload
 * streams the file itself. See src/config/signed-download.ts.
 */
export function sourceDocumentHandlers() {
  const settings = storageSettings()
  if (!settings) return []
  return [signedDownloadHandler({ bucket: settings.bucket, prefix: SOURCE_DOCUMENTS_PREFIX, sign: s3Signer(settings.config) })]
}

/**
 * Object storage for uploads (Cloudflare R2 or AWS S3; both speak the S3 API).
 *
 * Enabled only when S3_BUCKET is set; otherwise files stay on local disk (./media,
 * ./private-uploads). Vercel has no persistent disk, so a Vercel build without a bucket fails
 * loudly instead of silently losing uploads.
 *
 * Access is unchanged: objects are private (no public ACL) and every download still goes through
 * Payload's file route, so Media `publicRelease` and staff-only Source documents keep applying.
 * Do not set `disablePayloadAccessControl` or make the bucket public.
 */
export function objectStorage(): Plugin[] {
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    if (process.env.VERCEL) {
      throw new Error('S3_BUCKET is not set. On Vercel uploads must go to object storage (see docs/deployment-plan.md).')
    }
    // Insert storage fields even when the Local adapter is disabled.
  }

  const settings = storageSettings()
  if (bucket && !settings) throw new Error('S3_BUCKET is set but S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are missing.')

  return [
    s3Storage({
      bucket: bucket || 'disabled-local-storage',
      enabled: Boolean(bucket),
      alwaysInsertFields: true,
      acl: 'private',
      // Vercel functions accept request bodies up to 4.5 MB. With S3_CLIENT_UPLOADS=true the admin
      // uploads straight to the bucket (needs a bucket CORS rule allowing PUT from the site origin).
      // Payload alone would grant upload URLs to anyone with update rights (translators can update
      // Media); only editors/admins, who may create these files, get them here.
      clientUploads:
        process.env.S3_CLIENT_UPLOADS === 'true' ? { access: ({ req }) => isEditorUser(req.user) } : false,
      collections: {
        media: { prefix: 'media' },
        // Downloads use the presigned handler in sourceDocumentHandlers(), which runs first.
        [SOURCE_DOCUMENTS_PREFIX]: { prefix: SOURCE_DOCUMENTS_PREFIX },
      },
      config: settings?.config ?? { region: 'auto' },
    }),
  ]
}
