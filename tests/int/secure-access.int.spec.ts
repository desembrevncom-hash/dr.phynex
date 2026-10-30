import { randomBytes } from 'node:crypto'
import {
  buildUploadStoragePathData,
  getStorageFilePath,
  resolveSignedURLKey,
} from '@payloadcms/plugin-cloud-storage/utilities'
import { createLocalReq, getPayload, handleEndpoints, type Migration, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import config from '@/payload.config'
import { migrations } from '@/migrations'
import { SIGNED_DOWNLOAD_SECONDS, signedDownloadHandler, type Signer } from '@/config/signed-download'
import { assertDisposableDatabase } from '../helpers/database'

// B1 (session cookie) and B2 (Source documents download) through Payload's real REST and file
// routes on the isolated test database. Object storage is replaced by a recording signer: no
// bucket, no network, no real credentials. Uploaded fixtures go to the temp dir set up in
// vitest.setup.ts.

let payload: Payload
const password = randomBytes(24).toString('hex')
const tokens: Record<string, string> = {}
const signed: Parameters<Signer>[0][] = []
const fakeSigner: Signer = async (input) => {
  signed.push(input)
  return `https://bucket.test.invalid/${input.key}?X-Amz-Expires=${input.expiresIn}&X-Amz-Signature=test`
}
const handler = signedDownloadHandler({ bucket: 'test-bucket', prefix: 'source-documents', sign: fakeSigner })
let docA: { filename: string }, docB: { filename: string }, large: { filename: string }

/** Minimal structure Payload's PDF validator requires: header, then xref and %%EOF at the end. */
const pdf = (size: number) => {
  const head = Buffer.from('%PDF-1.4\n%test fixture\n')
  const tail = Buffer.from('xref\n0 1\n0000000000 65535 f \ntrailer\n<<>>\nstartxref\n0\n%%EOF\n')
  return Buffer.concat([head, Buffer.alloc(Math.max(0, size - head.length - tail.length), 0x20), tail])
}
const get = (path: string, token?: string) =>
  handleEndpoints({
    config,
    request: new Request('http://localhost:3000' + path, { headers: token ? { Authorization: 'JWT ' + token } : {} }),
  })

beforeAll(async () => {
  payload = await getPayload({ config })
  await assertDisposableDatabase(payload)
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
  for (const role of ['admin', 'editor', 'translator'] as const) {
    await payload.create({ collection: 'users', data: { email: `sec-${role}@test.local`, password, role } })
    const { token } = await payload.login({ collection: 'users', data: { email: `sec-${role}@test.local`, password } })
    tokens[role] = token!
  }
  const upload = (name: string, size: number) =>
    payload.create({
      collection: 'source-documents',
      data: { title: name },
      file: { data: pdf(size), mimetype: 'application/pdf', name, size },
    }) as unknown as Promise<{ filename: string }>
  docA = await upload('dossier-a.pdf', 2048)
  docB = await upload('dossier-b.pdf', 2048)
  large = await upload('packaging-8mb.pdf', 8 * 1024 * 1024)
  // Same position the storage plugin gives it in production: first handler, after Payload's access check.
  payload.collections['source-documents'].config.upload.handlers!.unshift(handler as never)
})

afterAll(async () => {
  const handlers = payload?.collections['source-documents']?.config.upload.handlers
  if (handlers) handlers.splice(handlers.indexOf(handler as never), 1)
  await payload?.destroy?.()
})

describe('B2: Source documents download', () => {
  it('anonymous: refused before any URL is signed', async () => {
    signed.length = 0
    const res = await get(`/api/source-documents/file/${docA.filename}`)
    expect([401, 403]).toContain(res.status)
    expect(res.headers.get('location')).toBeNull()
    expect(signed).toHaveLength(0)
  })

  it('staff: 302 to a 60-second URL for exactly that object, never cached', async () => {
    for (const role of ['admin', 'editor', 'translator']) {
      signed.length = 0
      const res = await get(`/api/source-documents/file/${docA.filename}`, tokens[role])
      expect(res.status).toBe(302)
      expect(signed).toEqual([expect.objectContaining({ bucket: 'test-bucket', key: `source-documents/${docA.filename}`, expiresIn: 60 })])
      expect(res.headers.get('location')).toBe(`https://bucket.test.invalid/source-documents/${docA.filename}?X-Amz-Expires=60&X-Amz-Signature=test`)
      expect(res.headers.get('cache-control')).toContain('no-store')
      expect(res.headers.get('cache-control')).toContain('private')
      expect(res.headers.get('referrer-policy')).toBe('no-referrer')
      expect(res.body).toBeNull()
    }
    expect(SIGNED_DOWNLOAD_SECONDS).toBe(60)
  })

  it('no cross-document access: each request signs only the requested, authorized object', async () => {
    signed.length = 0
    const res = await get(`/api/source-documents/file/${docB.filename}`, tokens.editor)
    expect(res.headers.get('location')).toContain(`source-documents/${docB.filename}`)
    expect(res.headers.get('location')).not.toContain(docA.filename)
    expect(signed.map((s) => s.key)).toEqual([`source-documents/${docB.filename}`])
  })

  it('unknown file and path tricks: 404/400, nothing signed', async () => {
    signed.length = 0
    expect((await get('/api/source-documents/file/missing.pdf', tokens.editor)).status).toBe(404)
    const traversal = await get('/api/source-documents/file/..%2F..%2F.env', tokens.editor)
    expect([400, 403, 404]).toContain(traversal.status)
    expect(signed).toHaveLength(0)
  })

  it('large PDF (8 MB): redirected, no bytes pass through the function', async () => {
    const res = await get(`/api/source-documents/file/${large.filename}`, tokens.editor)
    expect(res.status).toBe(302)
    expect(res.body).toBeNull()
    expect(res.headers.get('content-length')).toBeNull()
  })

  it('access withdrawn: a deleted account gets no new URL', async () => {
    const { docs } = await payload.find({ collection: 'users', where: { email: { equals: 'sec-translator@test.local' } }, overrideAccess: true })
    await payload.delete({ collection: 'users', id: docs[0].id, overrideAccess: true })
    signed.length = 0
    const res = await get(`/api/source-documents/file/${docA.filename}`, tokens.translator)
    expect([401, 403]).toContain(res.status)
    expect(signed).toHaveLength(0)
  })

  it('no secret or token in the redirect, and nothing written to the logs', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}))
    try {
      const res = await get(`/api/source-documents/file/${docA.filename}`, tokens.editor)
      const exposed = JSON.stringify([...res.headers.entries()])
      expect(exposed).not.toContain(tokens.editor)
      expect(exposed).not.toMatch(/secret|password/i)
      for (const spy of spies) expect(JSON.stringify(spy.mock.calls)).not.toContain('X-Amz-Signature')
    } finally {
      for (const spy of spies) spy.mockRestore()
    }
  })

  it('public media is unaffected: released images still stream through Payload, unreleased stay 403', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=', 'base64')
    const media = await payload.create({
      collection: 'media',
      locale: 'en',
      data: { alt: 'Fixture', publicRelease: true },
      file: { data: png, mimetype: 'image/png', name: 'sec-fixture.png', size: png.length },
    })
    const open = await get(`/api/media/file/${media.filename}`)
    expect(open.status).toBe(200)
    expect(open.headers.get('location')).toBeNull()
    await open.body?.cancel()
    await payload.update({ collection: 'media', id: media.id, locale: 'en', data: { publicRelease: false } })
    expect((await get(`/api/media/file/${media.filename}`)).status).toBe(403)
  })
})

describe('F1: signed key equals the key the storage plugin wrote', () => {
  const COLLECTION_PREFIX = 'source-documents'
  // Stored metadata is set directly in the isolated test DB to reproduce what the S3 adapter
  // persists (prefix / _objectKey); file bytes stay in the temp upload dir.
  const setStorageFields = (id: number | string, data: Record<string, unknown>) =>
    payload.db.updateOne({ collection: 'source-documents', id, data } as never)
  const upload = async (name: string) =>
    (await payload.create({
      collection: 'source-documents',
      data: { title: name },
      file: { data: pdf(2048), mimetype: 'application/pdf', name, size: 2048 },
    })) as unknown as { id: number; filename: string }
  const signedKeyFor = async (path: string) => {
    signed.length = 0
    const res = await get(path, tokens.editor)
    return { status: res.status, keys: signed.map((s) => s.key) }
  }

  it('client upload: the presigned GET key is exactly the PUT key from resolveSignedURLKey (UUID _objectKey)', async () => {
    const req = await createLocalReq({}, payload)
    const write = await resolveSignedURLKey({
      collectionPrefix: COLLECTION_PREFIX,
      collectionSlug: 'source-documents',
      docPrefix: undefined,
      filename: 'client-upload.pdf',
      req,
    })
    expect(write.fileKey).toMatch(new RegExp(`^${COLLECTION_PREFIX}/[0-9a-f-]{36}/client-upload\\.pdf$`))
    const doc = await upload(write.sanitizedFilename)
    await setStorageFields(doc.id, { _objectKey: write._objectKey, prefix: write.sanitizedDocPrefix })
    const { status, keys } = await signedKeyFor(`/api/source-documents/file/${doc.filename}`)
    expect(status).toBe(302)
    expect(keys).toEqual([write.fileKey])
  })

  it('server upload / legacy (_objectKey null or ""): key equals buildUploadStoragePathData and the plugin read path', async () => {
    for (const objectKey of [null, '']) {
      const doc = await upload(`legacy-${objectKey === null ? 'null' : 'empty'}.pdf`)
      await setStorageFields(doc.id, { _objectKey: objectKey, prefix: COLLECTION_PREFIX })
      const written = buildUploadStoragePathData({ collectionPrefix: COLLECTION_PREFIX, docPrefix: COLLECTION_PREFIX, filename: doc.filename }).storageFilePath
      // The plugin's own read lookup (no doc given) runs with the caller's access: use a staff user.
      const { docs: editors } = await payload.find({ collection: 'users', where: { email: { equals: 'sec-editor@test.local' } }, overrideAccess: true })
      const pluginRead = await getStorageFilePath({
        collection: payload.collections['source-documents'].config as never,
        collectionPrefix: COLLECTION_PREFIX,
        filename: doc.filename,
        req: await createLocalReq({ user: { ...editors[0], collection: 'users' } as never }, payload),
      } as never)
      const { status, keys } = await signedKeyFor(`/api/source-documents/file/${doc.filename}`)
      expect(status).toBe(302)
      expect(keys).toEqual([written])
      expect(keys).toEqual([`${COLLECTION_PREFIX}/${doc.filename}`])
      expect(pluginRead).toBe(written)
    }
  })

  it('nested prefix with UUID _objectKey, served with ?prefix= as the plugin URL does', async () => {
    const uuid = '0b7e4c2a-6f13-4d8e-9a51-7c2d3e4f5a6b'
    const doc = await upload('nested.pdf')
    await setStorageFields(doc.id, { _objectKey: uuid, prefix: `${COLLECTION_PREFIX}/2026/10` })
    const { status, keys } = await signedKeyFor(`/api/source-documents/file/${doc.filename}?prefix=${encodeURIComponent(`${COLLECTION_PREFIX}/2026/10`)}`)
    expect(status).toBe(302)
    expect(keys).toEqual([`${COLLECTION_PREFIX}/2026/10/${uuid}/nested.pdf`])
  })

  it('a legacy object and a client upload cannot share a filename, so the wrong one is never signed', async () => {
    const legacy = await upload('shared-name.pdf')
    // A second upload with the same name is renamed by Payload (getSafeFileName)…
    const second = await upload('shared-name.pdf')
    expect(second.filename).not.toBe(legacy.filename)
    // …and the database itself rejects a duplicate filename (unique index).
    await expect(
      setStorageFields(second.id, { filename: legacy.filename, _objectKey: '5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f' }),
    ).rejects.toThrow()
    await setStorageFields(second.id, { _objectKey: '5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f', prefix: COLLECTION_PREFIX })
    expect((await signedKeyFor(`/api/source-documents/file/${legacy.filename}`)).keys).toEqual([`${COLLECTION_PREFIX}/${legacy.filename}`])
    expect((await signedKeyFor(`/api/source-documents/file/${second.filename}`)).keys).toEqual([
      `${COLLECTION_PREFIX}/5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f/${second.filename}`,
    ])
    // If two records ever matched (e.g. data imported around the index), the handler answers 409
    // without signing; covered in tests/unit/auth-and-downloads.spec.ts.
  })

  it('anonymous and unknown file: still refused, nothing signed', async () => {
    signed.length = 0
    const anonymous = await get(`/api/source-documents/file/${docA.filename}`)
    expect([401, 403]).toContain(anonymous.status)
    expect((await get('/api/source-documents/file/not-stored.pdf', tokens.editor)).status).toBe(404)
    expect(signed).toEqual([])
  })
})

describe('B1: session cookie on this (HTTP localhost) configuration', () => {
  it('login sets an HttpOnly, SameSite=Lax payload-token without Secure, expiring in ~2 hours', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      const res = await handleEndpoints({
        config,
        request: new Request('http://localhost:3000/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'sec-editor@test.local', password }),
        }),
      })
      expect(res.status).toBe(200)
      const cookie = res.headers.get('set-cookie') ?? ''
      expect(cookie).toMatch(/payload-token=/)
      expect(cookie).toMatch(/HttpOnly/i)
      expect(cookie).toMatch(/SameSite=Lax/i)
      expect(cookie).not.toMatch(/;\s*Secure/i)
      const expires = Date.parse(/Expires=([^;]+)/i.exec(cookie)?.[1] ?? '')
      expect(expires - Date.now()).toBeGreaterThan(115 * 60 * 1000)
      expect(expires - Date.now()).toBeLessThanOrEqual(120 * 60 * 1000 + 5000)
      expect(JSON.stringify(log.mock.calls)).not.toContain('payload-token')
    } finally {
      log.mockRestore()
    }
  })

  it('the users collection uses the configured cookie policy', () => {
    const auth = payload.collections.users.config.auth
    expect(auth.cookies.sameSite).toBe('Lax')
    expect(auth.cookies.secure).toBe(false)
    expect(auth.tokenExpiration).toBe(7200)
  })

  it('CMS, preview and publishing keep working after login', async () => {
    const res = await handleEndpoints({
      config,
      request: new Request('http://localhost:3000/api/users/me', { headers: { Authorization: 'JWT ' + tokens.editor } }),
    })
    const body = (await res.json()) as { user?: { email?: string } }
    expect(body.user?.email).toBe('sec-editor@test.local')
  })
})
