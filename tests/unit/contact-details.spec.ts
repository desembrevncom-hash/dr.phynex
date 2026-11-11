import { describe, expect, it } from 'vitest'

import { contactRows, mailtoHref, telHref } from '@/lib/contact-details'

describe('contact block rows (Contact page + footer)', () => {
  it('hotline becomes a tel: link with country code, without spaces or dashes', () => {
    expect(telHref('+82 10-9876-5432')).toBe('tel:+821098765432')
    expect(telHref('010-9876-5432')).toBe('tel:01098765432')
    expect(telHref('  ')).toBeNull()
  })

  it('email becomes a mailto: link only for a plain address', () => {
    expect(mailtoHref('contact@phynex.co.kr')).toBe('mailto:contact@phynex.co.kr')
    expect(mailtoHref('not an email')).toBeNull()
    expect(mailtoHref('a@b.c?bcc=x@y.z <x>')).toBeNull()
  })

  it('rows keep the order email, hotline, hours, address and skip empty fields', () => {
    const rows = contactRows({
      email: 'contact@phynex.co.kr',
      phone: '+82 10-9876-5432',
      address: 'Teheran-ro, Gangnam-gu, Seoul, South Korea',
      hours: 'Monday–Saturday, 08:00–17:00, Korea Standard Time (KST, UTC+9)',
    })
    expect(rows.map((r) => r.key)).toEqual(['email', 'phone', 'hours', 'address'])
    expect(rows[0]).toMatchObject({ href: 'mailto:contact@phynex.co.kr' })
    expect(rows[1]).toMatchObject({ value: '+82 10-9876-5432', href: 'tel:+821098765432' })
    expect(contactRows({ email: '', phone: null, hours: ' ', address: 'Seoul' }).map((r) => r.key)).toEqual(['address'])
    expect(contactRows(null)).toEqual([])
  })
})
