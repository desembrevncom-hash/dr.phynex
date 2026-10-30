import { generatePayloadCookie } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { authCookies, isHttpsOrigin, SESSION_SECONDS } from '@/config/auth'
import { noStoreRedirectHeaders, objectKey, s3Signer, signedDownloadHandler, type Signer } from '@/config/signed-download'

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

describe('B2: object key from the authorized record', () => {
  it('uses the stored prefix/filename and rejects traversal', () => {
    expect(objectKey({ filename: 'a.pdf', prefix: 'source-documents' }, 'x')).toBe('source-documents/a.pdf')
    expect(objectKey({ filename: 'a.pdf', prefix: null }, 'source-documents')).toBe('source-documents/a.pdf')
    expect(objectKey({ filename: '../a.pdf' }, 'source-documents')).toBeNull()
    expect(objectKey({ filename: 'a.pdf', prefix: '../media' }, 'source-documents')).toBeNull()
    expect(objectKey({ filename: '/etc/passwd' }, 'source-documents')).toBeNull()
    expect(objectKey({}, 'source-documents')).toBeNull()
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
  // the record up itself through req.payload.find (faked here).
  const stored: Record<string, unknown>[] = [{ filename: 'stored.pdf', prefix: 'source-documents', mimeType: 'application/pdf' }]
  const find = vi.fn(async ({ where }: { where: { filename: { equals: string } } }) => ({
    docs: stored.filter((d) => d.filename === where.filename.equals),
  }))
  const req = { payload: { find } } as never
  const call = (doc: unknown, filename: string, clientUploadContext?: unknown) =>
    handler(req, { doc, params: { collection: 'source-documents', filename, clientUploadContext } })

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
