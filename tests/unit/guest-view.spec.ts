import { describe, expect, it } from 'vitest'

import { asGuestView } from '@/lib/guest-view'

const media = (id: number, publicRelease: boolean) => ({ id, filename: `m${id}.webp`, mimeType: 'image/webp', url: `/m${id}`, publicRelease })

describe('asGuestView (builder "Xem như khách")', () => {
  it('keeps released files and reduces private ones to their id, at any depth', () => {
    const product = {
      name: 'P',
      images: [media(1, true), media(2, false)],
      landing: [
        { blockType: 'band', image: media(3, false), mobileImage: media(4, true) },
        { blockType: 'ingredients', items: [{ name: 'x', image: media(5, false) }] },
      ],
    }
    const g = asGuestView(product)
    expect(g.images).toEqual([media(1, true), 2])
    expect(g.landing[0]).toEqual({ blockType: 'band', image: 3, mobileImage: media(4, true) })
    expect(g.landing[1]?.items?.[0]?.image).toBe(5)
    expect(product.images[1]).toEqual(media(2, false)) // input untouched
  })

  it('leaves non-media objects and ids alone', () => {
    expect(asGuestView({ a: { filename: 1 }, b: 7, c: null })).toEqual({ a: { filename: 1 }, b: 7, c: null })
  })
})
