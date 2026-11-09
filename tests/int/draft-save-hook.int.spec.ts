import { randomBytes } from 'crypto'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { REST_PATCH, REST_POST } from '@payloadcms/next/routes'
import { getPayload, type CollectionSlug, type GlobalSlug, type Migration, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import { withContentLocaleGuard } from '@/lib/content-mutations'
import config from '@/payload.config'
import type { User } from '@/payload-types'

import { assertDisposableDatabase } from '../helpers/database'

/**
 * Review of the shared hook src/hooks/publishLocale.ts (commit ce996f9), on its own:
 * - two consecutive draft saves work for every kind of content document (collections and
 *   globals): what the save returns is what a draft read returns, which is the exact check the
 *   Admin uses for "modified by another user"; no publish snapshot is written for a draft;
 * - publishing still changes only the requested language: the other language keeps both its
 *   public text and its unpublished draft; publishing all languages or a different language
 *   than the request is refused.
 */
type Loc = 'ko' | 'en' | 'vi'
let payload: Payload
let editor: User
const password = () => randomBytes(16).toString('hex')
const editorPassword = password()

const versionsTable = (slug: string) => `_${slug.replace(/-/g, '_')}_v`
async function latestVersion(slug: string, parentId?: number | string) {
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const table = sql.raw(`"${versionsTable(slug)}"`)
  const where = parentId === undefined ? sql`` : sql`WHERE parent_id = ${parentId}`
  const res = await db.execute(sql`SELECT id, snapshot, latest FROM ${table} ${where} ORDER BY id DESC LIMIT 1`)
  return res.rows[0] as { id: number; snapshot: boolean | null; latest: boolean | null }
}

type Target = {
  label: string
  versions: string
  field: string
  save: (locale: Loc, data: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<Record<string, unknown>>
  readDraft: (locale: Loc, select?: boolean) => Promise<Record<string, unknown>>
  guest: (locale: Loc) => Promise<Record<string, unknown> | undefined>
  parentId?: number | string
  setup: () => Promise<void>
}

function collectionTarget(slug: CollectionSlug, field: string, extra: (n: string) => Record<string, unknown> = () => ({})): Target {
  const t: Target = {
    label: `collection ${slug}`,
    versions: slug,
    field,
    async setup() {
      const n = randomBytes(3).toString('hex')
      // Public in VI and KO (published + approved), like the real content.
      const doc = await payload.create({
        collection: slug,
        locale: 'vi',
        data: { [field]: `[MẪU] VI công khai ${n}`, slug: `hook-${slug}-${n}`, translationStatus: 'approved', _status: 'published', ...extra(n) } as never,
        overrideAccess: true,
      })
      t.parentId = doc.id
      await payload.update({ collection: slug, id: doc.id, locale: 'ko', draft: true, data: { [field]: '[샘플] KO 공개' } as never, overrideAccess: true })
      await payload.update({ collection: slug, id: doc.id, locale: 'ko', draft: true, data: { translationStatus: 'approved' } as never, overrideAccess: true })
      await payload.update({ collection: slug, id: doc.id, locale: 'ko', data: { _status: 'published' } as never, overrideAccess: true })
    },
    save: (locale, data, opts = {}) =>
      payload.update({ collection: slug, id: t.parentId!, locale, draft: true, data: data as never, user: editor, overrideAccess: false, ...opts }) as never,
    readDraft: (locale, select = false) =>
      payload.findByID({ collection: slug, id: t.parentId!, locale, draft: true, depth: 0, user: editor, overrideAccess: false, ...(select ? { select: { updatedAt: true } } : {}) }) as never,
    guest: async (locale) =>
      (await payload.find({ collection: slug, locale, where: { id: { equals: t.parentId } }, depth: 0, overrideAccess: false, draft: false })).docs[0] as never,
  }
  return t
}

function globalTarget(slug: GlobalSlug, field: string): Target {
  return {
    label: `global ${slug}`,
    versions: slug,
    field,
    async setup() {
      await payload.updateGlobal({ slug, locale: 'vi', data: { [field]: '[MẪU] VI công khai', translationStatus: 'approved', _status: 'published' } as never, overrideAccess: true })
      await payload.updateGlobal({ slug, locale: 'ko', draft: true, data: { [field]: '[샘플] KO 공개' } as never, overrideAccess: true })
      await payload.updateGlobal({ slug, locale: 'ko', draft: true, data: { translationStatus: 'approved' } as never, overrideAccess: true })
      await payload.updateGlobal({ slug, locale: 'ko', data: { _status: 'published' } as never, overrideAccess: true })
    },
    save: (locale, data, opts = {}) =>
      payload.updateGlobal({ slug, locale, draft: true, data: data as never, user: editor, overrideAccess: false, ...opts }) as never,
    readDraft: (locale, select = false) =>
      payload.findGlobal({ slug, locale, draft: true, depth: 0, user: editor, overrideAccess: false, ...(select ? { select: { updatedAt: true } } : {}) }) as never,
    guest: async (locale) => (await payload.findGlobal({ slug, locale, depth: 0, overrideAccess: false, draft: false })) as never,
  }
}

const targets: Target[] = [
  collectionTarget('products', 'name'),
  collectionTarget('articles', 'title'),
  collectionTarget('ingredients', 'name'),
  collectionTarget('product-categories', 'name'),
  globalTarget('brand-page', 'title'),
]

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('_test')) throw new Error('Refusing to run outside the test database')
  payload = await getPayload({ config: await config })
  await assertDisposableDatabase(payload)
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
  const admin = await payload.create({ collection: 'users', data: { email: 'admin@test.local', password: password(), role: 'admin' }, overrideAccess: true })
  editor = await payload.create({ collection: 'users', data: { email: 'editor@test.local', password: editorPassword, role: 'editor' }, user: admin, overrideAccess: false })
  for (const t of targets) await t.setup()
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe.each(targets)('$label', (t) => {
  it('two consecutive draft saves: each read back has the updatedAt the save returned; no snapshot for a draft', async () => {
    for (const text of ['[MẪU] nháp lần 1', '[MẪU] nháp lần 2']) {
      const saved = await t.save('vi', { [t.field]: text })
      // The Admin's stale-data check reads exactly this (draft, select updatedAt, as the user).
      const readBack = await t.readDraft('vi', true)
      expect(readBack.updatedAt).toBe(saved.updatedAt)
      const latest = await latestVersion(t.versions, t.parentId)
      expect(latest.snapshot ?? false).toBe(false)
      expect((await t.readDraft('vi'))[t.field]).toBe(text)
    }
    // Still drafts: visitors keep the published VI text.
    expect((await t.guest('vi'))?.[t.field]).toMatch(/VI công khai/)
  })

  it('regression: two draft saves that also pass publishSpecificLocale "vi" behave the same (no snapshot, matching updatedAt)', async () => {
    // Everything is observed first, so a failure shows updatedAt, snapshot and visitor text together.
    const seen: Record<string, unknown>[] = []
    for (const text of ['[MẪU] nháp kèm publishSpecificLocale 1', '[MẪU] nháp kèm publishSpecificLocale 2']) {
      const saved = await t.save('vi', { [t.field]: text }, { draft: true, publishSpecificLocale: 'vi' })
      const readBack = await t.readDraft('vi', true)
      seen.push({
        sameUpdatedAt: readBack.updatedAt === saved.updatedAt,
        latestIsSnapshot: (await latestVersion(t.versions, t.parentId)).snapshot ?? false,
        draftText: (await t.readDraft('vi'))[t.field],
        // A draft never reaches visitors, whatever the client passed.
        guestVi: (await t.guest('vi'))?.[t.field],
        guestKo: (await t.guest('ko'))?.[t.field],
      })
    }
    const publicVi = seen[0].guestVi
    expect(publicVi).toMatch(/VI công khai/)
    expect(seen).toEqual(
      ['[MẪU] nháp kèm publishSpecificLocale 1', '[MẪU] nháp kèm publishSpecificLocale 2'].map((draftText) => ({
        sameUpdatedAt: true,
        latestIsSnapshot: false,
        draftText,
        guestVi: publicVi,
        guestKo: '[샘플] KO 공개',
      })),
    )
  })

  it('publishing VI changes only VI: KO keeps its public text and its unpublished draft', async () => {
    await t.save('ko', { [t.field]: '[샘플] KO 초안 (미공개)' })
    await t.save('vi', { [t.field]: '[MẪU] VI mới' })
    await t.save('vi', { translationStatus: 'approved' })
    await t.save('vi', { _status: 'published' }, { draft: false })
    // The publish (not the drafts) still goes through Payload's single-locale publish path.
    expect((await latestVersion(t.versions, t.parentId)).snapshot).toBe(true)
    expect((await t.guest('vi'))?.[t.field]).toBe('[MẪU] VI mới')
    expect((await t.guest('ko'))?.[t.field]).toBe('[샘플] KO 공개')
    expect((await t.readDraft('ko'))[t.field]).toBe('[샘플] KO 초안 (미공개)')
  })

  it('publishing all languages, or another language than the request, is refused', async () => {
    await expect(t.save('vi', { _status: 'published' }, { draft: false, publishAllLocales: true })).rejects.toThrow(/một ngôn ngữ/)
    // Collections: the hook refuses a language other than the request. Globals: Payload switches
    // the request to that language before any hook runs, so it becomes a KO publish, which KO's
    // own approval check refuses (KO has an unapproved draft). Either way nothing is published.
    await expect(t.save('vi', { _status: 'published' }, { draft: false, publishSpecificLocale: 'ko' })).rejects.toThrow(
      t.label.startsWith('global') ? /./ : /một ngôn ngữ/,
    )
    expect((await t.guest('ko'))?.[t.field]).toBe('[샘플] KO 공개')
    expect((await t.guest('vi'))?.[t.field]).toBe('[MẪU] VI mới')
    expect((await t.readDraft('ko'))[t.field]).toBe('[샘플] KO 초안 (미공개)')
  })
})

/**
 * Globals: a request written for one language asking to publish another.
 * Payload replaces req.locale with publishSpecificLocale for globals BEFORE any hook, so the hook
 * compares with the locale on the REST request, and project Local API calls go through
 * lib/content-mutations.ts, which compares before Payload is called.
 */
describe('global partnership-page: publish request in another language, KO approved but not published', () => {
  const slug = 'partnership-page'
  let token = ''
  const guest = async (locale: Loc) =>
    ((await payload.findGlobal({ slug, locale, depth: 0, overrideAccess: false, draft: false })) as { title?: string }).title
  const draftOf = async (locale: Loc) =>
    (await payload.findGlobal({ slug, locale, draft: true, depth: 0, overrideAccess: true })) as { title?: string; updatedAt?: string }
  const rest = async (method: 'POST' | 'PATCH', path: string, body: unknown) => {
    const handler = method === 'POST' ? REST_POST(config) : REST_PATCH(config)
    const res = await handler(
      new Request(`http://localhost:3021/api/${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ slug: path.split('?')[0].split('/') }) },
    )
    return { status: res.status, json: (await res.json()) as { result?: { updatedAt?: string } } }
  }
  /** A new KO text, approved, not yet published: a VI request must not publish it. */
  const approvedKoDraft = async (text: string) => {
    await payload.updateGlobal({ slug, locale: 'ko', draft: true, data: { title: text } as never, user: editor, overrideAccess: false })
    await payload.updateGlobal({ slug, locale: 'ko', draft: true, data: { translationStatus: 'approved' } as never, user: editor, overrideAccess: false })
    expect(await guest('ko')).not.toBe(text)
  }

  beforeAll(async () => {
    await payload.updateGlobal({ slug, locale: 'vi', data: { title: '[MẪU] VI công khai', translationStatus: 'approved', _status: 'published' } as never, overrideAccess: true })
    await payload.updateGlobal({ slug, locale: 'ko', draft: true, data: { title: '[샘플] KO 공개' } as never, overrideAccess: true })
    await payload.updateGlobal({ slug, locale: 'ko', draft: true, data: { translationStatus: 'approved' } as never, overrideAccess: true })
    await payload.updateGlobal({ slug, locale: 'ko', data: { _status: 'published' } as never, overrideAccess: true })
    token = (await payload.login({ collection: 'users', data: { email: 'editor@test.local', password: editorPassword } })).token ?? ''
  })

  it('REST ?locale=vi&publishSpecificLocale=ko is refused (400) before writing; public KO/VI unchanged', async () => {
    await approvedKoDraft('[샘플] KO 승인됨, 미공개 (REST)')
    const before = (await draftOf('ko')).updatedAt
    const res = await rest('POST', `globals/${slug}?locale=vi&publishSpecificLocale=ko`, { _status: 'published' })
    expect(res.status).toBe(400)
    expect(await guest('ko')).toBe('[샘플] KO 공개')
    expect(await guest('vi')).toBe('[MẪU] VI công khai')
    expect((await draftOf('ko')).updatedAt).toBe(before) // nothing written
  })

  it('REST without ?locale but with publishSpecificLocale is refused too', async () => {
    const res = await rest('POST', `globals/${slug}?publishSpecificLocale=ko`, { _status: 'published' })
    expect(res.status).toBe(400)
    expect(await guest('ko')).toBe('[샘플] KO 공개')
  })

  it('REST publishAllLocales is still refused', async () => {
    const res = await rest('POST', `globals/${slug}?locale=ko&publishAllLocales=true`, { _status: 'published' })
    expect(res.status).toBe(400)
    expect(await guest('ko')).toBe('[샘플] KO 공개')
  })

  it('project helper: updateGlobal with locale vi + publishSpecificLocale ko is refused before Payload; public KO/VI unchanged', async () => {
    const guarded = withContentLocaleGuard(payload)
    await expect(
      guarded.updateGlobal({ slug, locale: 'vi', publishSpecificLocale: 'ko', data: { _status: 'published' } as never, user: editor, overrideAccess: false }),
    ).rejects.toThrow(/khớp với publishSpecificLocale/)
    expect(await guest('ko')).toBe('[샘플] KO 공개')
    expect(await guest('vi')).toBe('[MẪU] VI công khai')
  })

  it('publishing KO with a KO request still works (REST and helper)', async () => {
    const ok = await rest('POST', `globals/${slug}?locale=ko&publishSpecificLocale=ko`, { _status: 'published' })
    expect(ok.status).toBe(200)
    expect(await guest('ko')).toBe('[샘플] KO 승인됨, 미공개 (REST)')
    expect(await guest('vi')).toBe('[MẪU] VI công khai')
    await approvedKoDraft('[샘플] KO 승인됨 (helper)')
    await withContentLocaleGuard(payload).updateGlobal({ slug, locale: 'ko', publishSpecificLocale: 'ko', data: { _status: 'published' } as never, user: editor, overrideAccess: false })
    expect(await guest('ko')).toBe('[샘플] KO 승인됨 (helper)')
    expect(await guest('vi')).toBe('[MẪU] VI công khai')
  })

  it('two consecutive REST draft saves still work (read-back updatedAt matches; visitors unchanged)', async () => {
    for (const text of ['[MẪU] VI nháp REST 1', '[MẪU] VI nháp REST 2']) {
      const res = await rest('POST', `globals/${slug}?locale=vi&draft=true`, { title: text })
      expect(res.status).toBe(200)
      const readBack = (await payload.findGlobal({ slug, locale: 'vi', draft: true, depth: 0, user: editor, overrideAccess: false, select: { updatedAt: true } })) as { updatedAt?: string }
      expect(readBack.updatedAt).toBe(res.json.result?.updatedAt)
      expect((await draftOf('vi')).title).toBe(text)
    }
    expect(await guest('vi')).toBe('[MẪU] VI công khai')
  })

  it('collection control: REST ?locale=vi&publishSpecificLocale=ko on a product is refused as before', async () => {
    const product = (await payload.find({ collection: 'products', limit: 1, overrideAccess: true, depth: 0 })).docs[0]
    const res = await rest('PATCH', `products/${product.id}?locale=vi&publishSpecificLocale=ko`, { _status: 'published' })
    expect(res.status).toBe(400)
  })
})
