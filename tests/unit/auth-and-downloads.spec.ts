import { generatePayloadCookie } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { authCookies, isHttpsOrigin, SESSION_SECONDS } from '@/config/auth'
import { noStoreRedirectHeaders, resolveObjectKey, s3Signer, signedDownloadHandler, type Signer } from '@/config/signed-download'

const cookieFor = (env: { serverURL?: string; vercel?: string }) =>
  generatePayloadCookie({
    collectionAuthConfig: { cookies: authCookies(env), tokenExpiration: SESSION_SECONDS } as never,
    cookiePrefix: 'payload',
    token: 'test-token-value',
  }) as string

describe('B1: session cookie flags', () => {
  it('Secure only for HTTPS origins or on Vercel; localhost HTTP keeps working', () => {
    expect(isHttpsOrigin('https://staging.drphynex.com')).toBe(true)
    expect(isHttpsOrigin('http://localhost:3000')).toBe(false)
    expect(isHttpsOrigin('not a url')).toBe(false)
    expect(authCookies({ serverURL: 'http://localhost:3000' })).toEqual({ secure: false, sameSite: 'Lax' })
    expect(authCookies({ serverURL: 'https://staging.drphynex.com' })).toEqual({ secure: true, sameSite: 'Lax' })
    // Vercel terminates TLS before the app; the configured URL may be missing there.
    expect(authCookies({ vercel: '1' }).secure).toBe(true)
    expect(authCookies({}).secure).toBe(false)
  })

  it('HTTPS staging cookie: HttpOnly, Secure, SameSite=Lax, 2-hour expiry', () => {
    const c = cookieFor({ serverURL: 'https://staging.drphynex.com' })
    expect(c).toMatch(/^payload-token=test-token-value/)
    expect(c).toMatch(/HttpOnly/)
    expect(c).toMatch(/Secure/)
    expect(c).toMatch(/SameSite=Lax/)
    const expires = Date.parse(/Expires=([^;]+)/.exec(c)![1])
    expect(Math.round((expires - Date.now()) / 60000)).toBeGreaterThanOrEqual(119)
  })

  it('localhost cookie: HttpOnly and SameSite=Lax without Secure', () => {
    const c = cookieFor({ serverURL: 'http://localhost:3000' })
    expect(c).toMatch(/HttpOnly/)
    expect(c).toMatch(/SameSite=Lax/)
    expect(c).not.toMatch(/Secure/)
  })
})

// Minimal collection config the storage plugin's resolver reads (a persisted `prefix` field).
const collection = { slug: 'source-documents', fields: [{ name: 'prefix', type: 'text' }] } as never
const UUID = '3f2b8c1e-9d4a-4b7e-8f61-2a5c7d9e0b13'

describe('F1: object key from the storage plugin resolver', () => {
  const key = (doc: Record<string, unknown>) =>
    resolveObjectKey({ collection, collectionPrefix: 'source-documents', doc, req: {} as never })

  it('legacy files without _objectKey (null or ""): prefix/filename', async () => {
    expect(await key({ filename: 'a.pdf', prefix: 'source-documents', _objectKey: null })).toBe('source-documents/a.pdf')
    expect(await key({ filename: 'a.pdf', prefix: 'source-documents', _objectKey: '' })).toBe('source-documents/a.pdf')
    expect(await key({ filename: 'a.pdf', prefix: null })).toBe('source-documents/a.pdf')
  })

  it('client uploads with a UUID _objectKey: prefix/_objectKey/filename', async () => {
    expect(await key({ filename: 'a.pdf', prefix: 'source-documents', _objectKey: UUID })).toBe(`source-documents/${UUID}/a.pdf`)
  })

  it('nested prefixes are kept, with and without _objectKey', async () => {
    expect(await key({ filename: 'a.pdf', prefix: 'source-documents/2026/10', _objectKey: UUID })).toBe(`source-documents/2026/10/${UUID}/a.pdf`)
    expect(await key({ filename: 'a.pdf', prefix: 'source-documents/2026/10' })).toBe('source-documents/2026/10/a.pdf')
  })

  it('refuses traversal and keys outside the collection prefix', async () => {
    for (const filename of ['../a.pdf', 'x/../a.pdf', 'a/b.pdf', '..', 'a\\b.pdf', '', 'a\u0000.pdf']) {
      expect(await key({ filename, prefix: 'source-documents' })).toBeNull()
    }
    // "../media" sanitizes to "media": outside source-documents/ → refused.
    expect(await key({ filename: 'a.pdf', prefix: '../media' })).toBeNull()
    expect(await key({ filename: 'a.pdf', prefix: 'media', _objectKey: UUID })).toBeNull()
    // Traversal segments inside _objectKey are dropped by the plugin, never followed.
    expect(await key({ filename: 'a.pdf', prefix: 'source-documents', _objectKey: '../../media' })).toBe('source-documents/media/a.pdf')
  })
})

describe('B2: redirect handler', () => {
  const recorded: Parameters<Signer>[0][] = []
  const sign: Signer = async (input) => {
    recorded.push(input)
    return 'https://bucket.test.invalid/signed'
  }
  const handler = signedDownloadHandler({ bucket: 'b', prefix: 'source-documents', sign })
  // Payload passes `doc` only when read access is a query; with plain `true` the handler looks
  // the record up itself through req.payload.find (faked here, honouring filename/prefix filters).
  const stored: Record<string, unknown>[] = [
    { filename: 'stored.pdf', prefix: 'source-documents', _objectKey: null, mimeType: 'application/pdf' },
    { filename: 'uploaded.pdf', prefix: 'source-documents', _objectKey: UUID, mimeType: 'application/pdf' },
    { filename: 'twice.pdf', prefix: 'source-documents', _objectKey: null },
    { filename: 'twice.pdf', prefix: 'source-documents', _objectKey: UUID },
  ]
  type Where = { and: ({ filename?: { equals: string } } & { prefix?: { equals: string } })[] }
  const find = vi.fn(async ({ where, limit }: { where: Where; limit: number }) => {
    const filename = where.and.find((c) => c.filename)?.filename?.equals
    const prefix = where.and.find((c) => c.prefix)?.prefix?.equals
    return { docs: stored.filter((d) => d.filename === filename && (prefix === undefined || d.prefix === prefix)).slice(0, limit) }
  })
  const req = { payload: { find, collections: { 'source-documents': { config: collection } } } } as never
  const call = (doc: unknown, filename: string, clientUploadContext?: unknown) =>
    handler(req, { doc, params: { collection: 'source-documents', filename, clientUploadContext } })

  it('client-uploaded record: signs prefix/_objectKey/filename, not prefix/filename', async () => {
    recorded.length = 0
    expect((await call(undefined, 'uploaded.pdf'))!.status).toBe(302)
    expect(recorded.map((r) => r.key)).toEqual([`source-documents/${UUID}/uploaded.pdf`])
  })

  it('two records share a filename (legacy + client upload): 409, nothing signed', async () => {
    recorded.length = 0
    expect((await call(undefined, 'twice.pdf'))!.status).toBe(409)
    expect(recorded).toHaveLength(0)
  })

  it('path tricks in the requested name: 404 before any lookup or signature', async () => {
    recorded.length = 0
    find.mockClear()
    for (const name of ['../stored.pdf', 'source-documents/stored.pdf', '..\\stored.pdf']) {
      expect((await call(undefined, name))!.status).toBe(404)
    }
    expect(find).not.toHaveBeenCalled()
    expect(recorded).toHaveLength(0)
  })

  it('no doc from Payload: looks up the record with the caller access; unknown → 404, nothing signed', async () => {
    recorded.length = 0
    find.mockClear()
    const res = (await call(undefined, 'stored.pdf'))!
    expect(res.status).toBe(302)
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'source-documents', overrideAccess: false, req }))
    expect(recorded.map((r) => r.key)).toEqual(['source-documents/stored.pdf'])
    recorded.length = 0
    expect((await call(undefined, 'unknown.pdf'))!.status).toBe(404)
    expect(recorded).toHaveLength(0)
  })

  it('302 with no-store headers and a 60 s signature for the stored object', async () => {
    recorded.length = 0
    const res = (await call({ filename: 'a.pdf', prefix: 'source-documents', mimeType: 'application/pdf' }, 'a.pdf'))!
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://bucket.test.invalid/signed')
    expect(res.headers.get('cache-control')).toBe('private, no-store, max-age=0, must-revalidate')
    expect(recorded).toEqual([{ bucket: 'b', key: 'source-documents/a.pdf', filename: 'a.pdf', mimeType: 'application/pdf', expiresIn: 60 }])
  })

  it('record/request mismatch → 404, nothing signed; client-upload internal read → falls through', async () => {
    recorded.length = 0
    expect((await call({ filename: 'a.pdf' }, 'b.pdf'))!.status).toBe(404)
    expect(call({ filename: 'a.pdf' }, 'a.pdf', { key: 'x' })).toBeUndefined()
    expect(recorded).toHaveLength(0)
  })

  it('never logs', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}))
    await call({ filename: 'a.pdf' }, 'a.pdf')
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    }
  })

  it('redirect headers forbid caching and referrer leakage', () => {
    const h = noStoreRedirectHeaders('https://x.invalid/y')
    expect(h.get('pragma')).toBe('no-cache')
    expect(h.get('expires')).toBe('0')
    expect(h.get('referrer-policy')).toBe('no-referrer')
    expect(h.get('vary')).toContain('Cookie')
  })
})

describe('B2: real AWS presigner, offline (fake credentials, no request is made)', () => {
  it('URL expires in 60 s, targets one key, carries no secret', async () => {
    const secretAccessKey = 'TESTSECRETKEYVALUE0000000000000000000000'
    const sign = s3Signer({
      region: 'auto',
      endpoint: 'https://account.r2.test.invalid',
      forcePathStyle: true,
      credentials: { accessKeyId: 'TESTACCESSKEYID', secretAccessKey },
    })
    const url = new URL(await sign({ bucket: 'staging', key: 'source-documents/a b.pdf', filename: 'a b.pdf', mimeType: 'application/pdf', expiresIn: 60 }))
    expect(url.host).toBe('account.r2.test.invalid')
    expect(decodeURIComponent(url.pathname)).toBe('/staging/source-documents/a b.pdf')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('60')
    expect(url.searchParams.get('response-cache-control')).toContain('no-store')
    expect(url.searchParams.get('response-content-disposition')).toMatch(/^inline;/)
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/)
    expect(url.toString()).not.toContain(secretAccessKey)
    // Expiry is enforced by the bucket from X-Amz-Date + X-Amz-Expires (checked on R2 in staging).
    const issued = url.searchParams.get('X-Amz-Date')!
    const issuedAt = Date.parse(issued.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'))
    expect(Math.abs(issuedAt - Date.now())).toBeLessThan(5000)
  })
})
