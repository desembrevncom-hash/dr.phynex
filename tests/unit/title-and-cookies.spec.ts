import { describe, expect, it } from 'vitest'

import { cookieDeletionDomains, vendorCookiesToClear } from '@/lib/analytics/consent'
import { whenTitleReady, type TitleEnv } from '@/lib/analytics/title'

/** Fake document head: titles change on demand, timers run when told to. */
function fakeTitleEnv(initial: string) {
  let title = initial
  const listeners = new Set<() => void>()
  const timers = new Map<number, () => void>()
  let nextTimer = 1
  const env: TitleEnv = {
    getTitle: () => title,
    observe: (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    setTimer: (fn) => {
      const id = nextTimer++
      timers.set(id, fn)
      return id
    },
    clearTimer: (id) => timers.delete(id as number),
  }
  return {
    env,
    setTitle: (t: string) => {
      title = t
      for (const fn of [...listeners]) fn()
    },
    runTimers: () => {
      for (const [id, fn] of [...timers]) {
        timers.delete(id)
        fn()
      }
    },
    listenerCount: () => listeners.size,
  }
}

describe('page_title after client navigation', () => {
  it('first page view: sends at once with the server-rendered title', () => {
    const f = fakeTitleEnv('Dr.PhynEX')
    const sent: string[] = []
    whenTitleReady((t) => sent.push(t), null, f.env)
    expect(sent).toEqual(['Dr.PhynEX'])
  })

  it('waits for Next.js to apply the new <title>, then sends exactly once (KO / EN / VI)', () => {
    for (const [previous, next] of [
      ['Dr.PhynEX', '제품 · Dr.PhynEX'],
      ['Products · Dr.PhynEX', 'Contact · Dr.PhynEX'],
      ['Sản phẩm · Dr.PhynEX', 'Liên hệ · Dr.PhynEX'],
    ]) {
      const f = fakeTitleEnv(previous)
      const sent: string[] = []
      whenTitleReady((t) => sent.push(t), previous, f.env)
      expect(sent).toEqual([])
      f.setTitle(next)
      f.setTitle(next)
      f.runTimers()
      expect(sent).toEqual([next])
      expect(f.listenerCount()).toBe(0)
    }
  })

  it('ignores the transient empty title Next.js may set before the real one', () => {
    const f = fakeTitleEnv('Products · Dr.PhynEX')
    const sent: string[] = []
    whenTitleReady((t) => sent.push(t), 'Products · Dr.PhynEX', f.env)
    f.setTitle('')
    expect(sent).toEqual([])
    f.setTitle('Contact · Dr.PhynEX')
    expect(sent).toEqual(['Contact · Dr.PhynEX'])
  })

  it('pages sharing a title (filters) still send once, after the timeout', () => {
    const f = fakeTitleEnv('Products · Dr.PhynEX')
    const sent: string[] = []
    whenTitleReady((t) => sent.push(t), 'Products · Dr.PhynEX', f.env)
    f.runTimers()
    f.runTimers()
    expect(sent).toEqual(['Products · Dr.PhynEX'])
  })

  it('cancelled (route changed again / Strict Mode re-run): sends nothing and stops listening', () => {
    const f = fakeTitleEnv('A')
    const sent: string[] = []
    const cancel = whenTitleReady((t) => sent.push(t), 'A', f.env)
    cancel()
    f.setTitle('B')
    f.runTimers()
    expect(sent).toEqual([])
    expect(f.listenerCount()).toBe(0)
  })

  it('already updated when the effect runs: sends immediately', () => {
    const f = fakeTitleEnv('Liên hệ · Dr.PhynEX')
    const sent: string[] = []
    whenTitleReady((t) => sent.push(t), 'Sản phẩm · Dr.PhynEX', f.env)
    expect(sent).toEqual(['Liên hệ · Dr.PhynEX'])
  })
})

describe('vendor cookie removal on withdrawal', () => {
  it('targets host-only plus every parent domain down to the registrable one, never a public suffix', () => {
    expect(cookieDeletionDomains('localhost')).toEqual([null])
    expect(cookieDeletionDomains('127.0.0.1')).toEqual([null])
    expect(cookieDeletionDomains('::1')).toEqual([null])
    expect(cookieDeletionDomains('drphynex.com')).toEqual([null, '.drphynex.com'])
    expect(cookieDeletionDomains('www.drphynex.com')).toEqual([null, '.www.drphynex.com', '.drphynex.com'])
    expect(cookieDeletionDomains('drphynex.com.vn')).toEqual([null, '.drphynex.com.vn'])
    expect(cookieDeletionDomains('www.drphynex.com.vn')).toEqual([null, '.www.drphynex.com.vn', '.drphynex.com.vn'])
    expect(cookieDeletionDomains('staging.drphynex.co.kr')).toEqual([null, '.staging.drphynex.co.kr', '.drphynex.co.kr'])
    expect(cookieDeletionDomains('DRPHYNEX.VN.')).toEqual([null, '.drphynex.vn'])
    expect(cookieDeletionDomains('drphynex-git-staging.vercel.app')).toEqual([null, '.drphynex-git-staging.vercel.app'])
    for (const host of ['com.vn', 'co.kr', 'vercel.app']) expect(cookieDeletionDomains(host)).toEqual([null])
    for (const host of ['www.drphynex.com.vn', 'staging.drphynex.co.kr', 'a.b.drphynex.com']) {
      for (const d of cookieDeletionDomains(host)) expect(['.com.vn', '.vn', '.co.kr', '.kr', '.com']).not.toContain(d)
    }
  })

  it('only clears readable cookies of withdrawn categories', () => {
    const cookies = 'NEXT_LOCALE=vi; drphynex_consent=v1.a0.m1; _ga=GA1.1.x; _ga_ABC=GS1; _fbp=fb.1; _ttp=t; other=1'
    expect(vendorCookiesToClear(cookies, { analytics: false, marketing: true })).toEqual(['_ga', '_ga_ABC'])
    expect(vendorCookiesToClear(cookies, { analytics: true, marketing: false })).toEqual(['_fbp', '_ttp'])
    expect(vendorCookiesToClear(cookies, { analytics: true, marketing: true })).toEqual([])
    expect(vendorCookiesToClear('', { analytics: false, marketing: false })).toEqual([])
  })
})
