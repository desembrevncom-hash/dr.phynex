// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HomeSlider, type HomeSlide } from '@/components/home/HomeSlider'
import {
  autoplayReducer,
  initialAutoplayState,
  isAutoplaying,
  type AutoplayState,
} from '@/components/home/autoplay'

vi.mock('next/link', () => ({
  default: (p: { href: string; className?: string; children?: unknown }) =>
    createElement('a', { href: p.href, className: p.className }, p.children as never),
}))

const AUTOPLAY = 6000
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const keys = ['brand', 'forma', 'luma', 'balm', 'sheet'] as const
const slides: HomeSlide[] = keys.map((k) => ({
  key: k,
  theme: k,
  title: k,
  name: k,
  headline: k,
  description: k,
  cta: { label: k, href: '/' + k },
  visual: null,
}))
const labels = {
  carousel: 'carousel',
  controls: 'controls',
  chooseSlide: 'choose',
  pause: 'PAUSE',
  play: 'PLAY',
  slideLabels: keys.map((k) => k),
  dotLabels: keys.map((k) => k),
}

let host: HTMLDivElement
let outside: HTMLAnchorElement // stands in for a footer link
let root: Root
let reduced = false

const mount = () =>
  act(() => {
    root.render(createElement(HomeSlider, { slides, labels }))
  })
const slider = () => host.querySelector('section') as HTMLElement
const dots = () => [...host.querySelectorAll<HTMLButtonElement>('.home-slider-dot')]
const playButton = () => host.querySelector('.home-slider-play') as HTMLButtonElement
const current = () =>
  [...host.querySelectorAll('.home-slide')].findIndex((s) => s.classList.contains('is-active'))
const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

const pointer = (type: 'pointerover' | 'pointerout', pointerType = 'mouse') =>
  act(() => {
    const e = new PointerEvent(type, { bubbles: true, relatedTarget: document.body })
    Object.defineProperty(e, 'pointerType', { value: pointerType })
    slider().dispatchEvent(e)
  })
const hoverIn = (t?: string) => pointer('pointerover', t)
const hoverOut = () => pointer('pointerout')
const focusIn = (el: HTMLElement = dots()[1]) =>
  act(() => {
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
const focusOut = (to: HTMLElement | null = outside, from: HTMLElement = dots()[1]) =>
  act(() => {
    from.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: to }))
  })

beforeEach(() => {
  vi.useFakeTimers()
  reduced = false
  window.matchMedia = ((q: string) => ({
    matches: reduced && q.includes('reduce'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
  host = document.createElement('div')
  outside = document.createElement('a')
  document.body.append(host, outside)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  outside.remove()
  vi.useRealTimers()
})

describe('HomeSlider autoplay pause sources', () => {
  it('advances every 6 s with nothing pausing it (baseline)', () => {
    mount()
    tick(AUTOPLAY - 1)
    expect(current()).toBe(0)
    tick(1)
    expect(current()).toBe(1)
  })

  it('A. hover still active, focus leaves the slider: does not advance', () => {
    mount()
    hoverIn()
    focusIn()
    tick(3000)
    focusOut() // focus goes to the footer; pointer is still over the slider
    tick(AUTOPLAY * 3)
    expect(current()).toBe(0)
    expect(slider().querySelector('.home-slider-track')?.getAttribute('aria-live')).toBe('polite')
  })

  it('B. focus still inside, pointer leaves: does not advance', () => {
    mount()
    focusIn()
    hoverIn()
    hoverOut() // focus is still on a control inside the slider
    tick(AUTOPLAY * 3)
    expect(current()).toBe(0)
  })

  it('B2. focus moving between controls inside the slider does not count as leaving', () => {
    mount()
    focusIn(dots()[1])
    focusOut(dots()[2], dots()[1])
    focusIn(dots()[2])
    tick(AUTOPLAY * 2)
    expect(current()).toBe(0)
  })

  it('C. user Pause survives hover and focus entering and leaving', () => {
    mount()
    act(() => playButton().click())
    expect(playButton().getAttribute('aria-label')).toBe('PLAY')
    hoverIn()
    hoverOut()
    focusIn()
    focusOut()
    tick(AUTOPLAY * 3)
    expect(current()).toBe(0)

    // Play again with nothing else holding it: autoplay resumes.
    act(() => playButton().click())
    expect(playButton().getAttribute('aria-label')).toBe('PAUSE')
    tick(AUTOPLAY)
    expect(current()).toBe(1)
  })

  it('D. autoplay resumes only after every pause source has cleared, with a single timer', () => {
    mount()
    hoverIn()
    focusIn()
    tick(AUTOPLAY * 2)
    expect(current()).toBe(0)

    hoverOut() // focus remains
    tick(AUTOPLAY * 2)
    expect(current()).toBe(0)

    focusOut() // last pause source cleared
    tick(AUTOPLAY - 1)
    expect(current()).toBe(0)
    tick(1)
    expect(current()).toBe(1)

    // Exactly one step per period afterwards (a duplicate interval would double-step).
    tick(AUTOPLAY * 2)
    expect(current()).toBe(3)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('D2. an unrelated re-render does not reset or duplicate the cycle', () => {
    mount()
    tick(3000)
    mount() // parent re-render with identical props
    hoverIn('touch') // touch taps never pause (compatibility mouse events have no leave)
    tick(AUTOPLAY - 3000)
    expect(current()).toBe(1)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('E. reduced motion never autoplays', () => {
    reduced = true
    mount()
    tick(AUTOPLAY * 5)
    expect(current()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    // Manual navigation still works.
    act(() => dots()[3].click())
    expect(current()).toBe(3)
  })

  it('clears its timer on unmount', () => {
    mount()
    expect(vi.getTimerCount()).toBe(1)
    act(() => root.unmount())
    expect(vi.getTimerCount()).toBe(0)
    root = createRoot(host)
  })
})

describe('autoplay state', () => {
  const on = (over: Partial<AutoplayState>) => ({ ...initialAutoplayState, ...over })

  it('runs only when no pause source is active', () => {
    expect(isAutoplaying(initialAutoplayState, 5)).toBe(true)
    for (const k of ['hover', 'focus', 'userPaused', 'reducedMotion'] as const) {
      expect(isAutoplaying(on({ [k]: true }), 5)).toBe(false)
    }
    expect(isAutoplaying(initialAutoplayState, 1)).toBe(false)
  })

  it('keeps sources independent', () => {
    let s = autoplayReducer(initialAutoplayState, { type: 'hover', value: true })
    s = autoplayReducer(s, { type: 'focus', value: true })
    s = autoplayReducer(s, { type: 'focus', value: false })
    expect(s.hover).toBe(true)
    s = autoplayReducer(s, { type: 'hover', value: false })
    expect(s).toEqual(initialAutoplayState)
  })

  it('returns the same state when nothing changes', () => {
    const s = on({ hover: true })
    expect(autoplayReducer(s, { type: 'hover', value: true })).toBe(s)
  })
})
