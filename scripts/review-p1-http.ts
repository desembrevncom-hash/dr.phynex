import { config as loadEnv } from 'dotenv'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { getPayload } from 'payload'
import { assertDisposableDatabase } from '../tests/helpers/database'
loadEnv({ path: '.env.local', override: true })
async function main() {
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  await assertDisposableDatabase(payload)
  const origin = 'http://localhost:3015',
    suffix = randomUUID().slice(0, 8)
  let checks = 0
  const check = (value: unknown, label: string) => {
    assert.ok(value, label)
    checks++
    console.log('PASS ' + label)
  }
  const tokens: Record<string, string> = {}
  const request = (path: string, data: unknown, role = 'editor', method = 'POST') =>
    fetch(origin + '/api/' + path, {
      method,
      headers: { Authorization: 'JWT ' + tokens[role], 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  const read = async (path: string) => {
    const r = await fetch(origin + path)
    return { status: r.status, html: await r.text() }
  }
  try {
    for (const role of ['editor', 'translator'] as const) {
      const password = randomBytes(24).toString('hex'),
        email = 'p1-http-' + role + '-' + suffix + '@test.local'
      await payload.create({ collection: 'users', data: { email, password, role } })
      tokens[role] = (
        await payload.login({ collection: 'users', data: { email, password } })
      ).token!
    }
    const title = 'PUBLIC EN ' + suffix,
      metadata = 'PUBLIC META ' + suffix,
      ko = 'PUBLIC KO ' + suffix,
      privateText = 'PRIVATE DRAFT ' + suffix
    for (const [locale, label] of [
      ['en', title],
      ['ko', ko],
    ] as const) {
      await payload.updateGlobal({
        slug: 'brand-page',
        locale,
        draft: true,
        data: {
          title: label,
          intro: label,
          seo: { title: locale === 'en' ? metadata : label },
          translationStatus: 'in-review',
        },
      })
      await payload.updateGlobal({
        slug: 'brand-page',
        locale,
        draft: true,
        data: { translationStatus: 'approved' },
      })
      await payload.updateGlobal({ slug: 'brand-page', locale, data: { _status: 'published' } })
    }
    for (const role of ['translator', 'editor']) {
      check(
        (
          await request(
            'globals/brand-page?locale=en&draft=true',
            { title: privateText, intro: privateText, seo: { title: privateText } },
            role,
          )
        ).status === 200,
        role + ' global EN draft saves',
      )
      for (const locale of ['all', 'invalid', '*'])
        check(
          (await request('globals/brand-page?locale=' + locale, { _status: 'published' }, role))
            .status === 400,
          role + ' global publish rejects ' + locale,
        )
      const en = await read('/en/brand'),
        other = await read('/ko/brand')
      check(
        en.status === 200 &&
          en.html.includes(title) &&
          en.html.includes(metadata) &&
          !en.html.includes(privateText),
        'public HTML/title/metadata preserve EN after ' + role + ' draft and rejected publish',
      )
      check(
        other.status === 200 && other.html.includes(ko) && !other.html.includes(privateText),
        'valid KO remains public after ' + role + ' EN draft',
      )
    }
    check(
      (await request('globals/brand-page?locale=en', { _status: 'published' })).status === 409,
      'single-locale publish requires draft reapproval',
    )
    check(
      (await request('globals/brand-page?locale=en&draft=true', { translationStatus: 'approved' }))
        .status === 200,
      'editor deliberately reapproves without content edits',
    )
    check(
      (await request('globals/brand-page?locale=en', { _status: 'published' })).status === 200,
      'approved locale can publish',
    )
    check(
      (await read('/en/brand')).html.includes(privateText),
      'new EN appears only after deliberate approval and publish',
    )
    const png = await sharp({
      create: { width: 40, height: 40, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer()
    const media = await payload.create({
      collection: 'media',
      locale: 'en',
      data: { alt: 'P1 HTTP', publicRelease: true },
      file: {
        data: png,
        name: 'p1-http-' + suffix + '.png',
        mimetype: 'image/png',
        size: png.length,
      },
    })
    const path = '/api/media/file/' + media.filename
    const originalResponse = await fetch(origin + path),
      original = Buffer.from(await originalResponse.arrayBuffer())
    const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex')
    for (const role of ['translator', 'editor']) {
      check(
        (
          await request(
            'media/' +
              media.id +
              '?locale=en&uploadEdits[crop][x]=0&uploadEdits[crop][y]=0&uploadEdits[widthInPixels]=10&uploadEdits[heightInPixels]=10',
            {},
            role,
            'PATCH',
          )
        ).status === (role === 'translator' ? 403 : 409),
        role + ' HTTP crop rejected',
      )
      const saved = await payload.findByID({ collection: 'media', id: media.id })
      check(
        ['filename', 'filesize', 'width', 'height', 'publicRelease'].every(
          (k) => saved[k as keyof typeof saved] === media[k as keyof typeof media],
        ),
        role + ' rejected crop retains file metadata and release',
      )
      const r = await fetch(origin + path),
        bytes = Buffer.from(await r.arrayBuffer())
      check(
        r.status === 200 &&
          hash(bytes) === hash(original) &&
          r.headers.get('cache-control')?.includes('no-store'),
        role + ' original still public with identical checksum and no-store',
      )
    }
    check(
      (
        await request(
          'media/' + media.id + '?locale=en',
          { alt: 'Translated alt' },
          'translator',
          'PATCH',
        )
      ).status === 200,
      'translator alt text remains editable',
    )
    const p = await payload.create({
      collection: 'products',
      locale: 'en',
      data: {
        name: 'HTTP restore ' + suffix,
        accent: 'navy',
        slug: 'p1-restore-' + suffix,
        translationStatus: 'approved',
        _status: 'published',
      },
    })
    const versions = await payload.findVersions({
        collection: 'products',
        where: { parent: { equals: p.id } },
      }),
      globals = await payload.findGlobalVersions({ slug: 'brand-page' })
    for (const draft of [false, true]) {
      check(
        (
          await request(
            'products/versions/' + versions.docs[0].id + '?locale=en&draft=' + draft,
            {},
          )
        ).status === 409,
        'HTTP collection restore blocked draft=' + draft,
      )
      check(
        (
          await request(
            'globals/brand-page/versions/' + globals.docs[0].id + '?locale=en&draft=' + draft,
            {},
          )
        ).status === 409,
        'HTTP global restore blocked draft=' + draft,
      )
    }
    check(
      (await read('/en/brand')).html.includes(privateText),
      'rejected restore preserves current public global',
    )
    check(
      (await read('/en/products/' + p.slug)).html.includes(p.name),
      'rejected restore preserves current public collection',
    )
    console.log('P1 HTTP checks passed: ' + checks)
  } finally {
    await payload.destroy()
  }
}
main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error('P1 HTTP validation failed; no credentials or response bodies logged')
    process.exit(1)
  })
