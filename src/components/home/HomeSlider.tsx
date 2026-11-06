'use client'

import Link from 'next/link'
import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'

import { autoplayReducer, initialAutoplayState, isAutoplaying } from './autoplay'

export type HomeSlide = {
  key: string
  theme: 'brand' | 'forma' | 'luma' | 'balm' | 'sheet'
  /** Latin display name, e.g. "MX-01 FORMA" or "INSIGHTLOGY™", or a CMS title. */
  title: ReactNode
  /** Language of the title; built-in display names are English, CMS titles use the page locale. */
  titleLang?: string
  /** Accessible name used in slide/dot labels. */
  name: string
  headline: string
  description: ReactNode
  cta: { label: string; href: string }
  /** Right-hand visual of the split layout (ignored when `background` is set). */
  visual: ReactNode
  /** Full-frame banner image behind the copy. */
  background?: ReactNode
  /** Copy panel tone on a full-frame image. */
  tone?: 'dark' | 'light'
  /** The full-frame image already shows the copy: keep it for screen readers, show only the CTA. */
  copyHidden?: boolean
}

type Labels = {
  carousel: string
  controls: string
  chooseSlide: string
  pause: string
  play: string
  /** Pre-formatted per slide: "1 / 5: Brand". */
  slideLabels: string[]
  dotLabels: string[]
}

const AUTOPLAY_MS = 6000
const SWIPE_PX = 40

/**
 * Five-banner home slider. Autoplay 6 s; a user Pause is sticky; hover/focus pauses;
 * reduced motion disables autoplay. Hidden slides are inert (not focusable or announced).
 */
export function HomeSlider({ slides, labels }: { slides: HomeSlide[]; labels: Labels }) {
  const total = slides.length
  const [current, setCurrent] = useState(0)
  // hover, focus, user Pause and reduced motion are independent pause sources (see autoplay.ts).
  const [pause, dispatch] = useReducer(autoplayReducer, initialAutoplayState)
  // Bumped on manual navigation so the 6 s countdown restarts from the new slide.
  const [cycle, setCycle] = useState(0)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => dispatch({ type: 'reducedMotion', value: mq.matches })
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const playing = isAutoplaying(pause, total)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setCurrent((i) => (i + 1) % total), AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [playing, total, cycle])

  const goTo = useCallback(
    (index: number) => {
      setCurrent(((index % total) + total) % total)
      setCycle((c) => c + 1)
    },
    [total],
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      goTo(current + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goTo(current - 1)
    }
  }

  // Focus only counts as gone when it moves outside the slider; hover is not touched here.
  const onBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      dispatch({ type: 'focus', value: false })
    }
  }

  return (
    <section
      className={`home-slider${slides[current]?.background != null ? ' is-full-active' : ''}`}
      aria-roledescription="carousel"
      aria-label={labels.carousel}
      onKeyDown={onKeyDown}
      // Touch taps also emit compatibility mouse events with no matching leave, so ignore touch.
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') dispatch({ type: 'hover', value: true })
      }}
      onPointerLeave={() => dispatch({ type: 'hover', value: false })}
      onFocus={() => dispatch({ type: 'focus', value: true })}
      onBlur={onBlur}
      onTouchStart={(e) => {
        touchX.current = e.changedTouches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchX.current
        touchX.current = null
        const end = e.changedTouches[0]?.clientX
        if (start == null || end == null) return
        const diff = end - start
        if (Math.abs(diff) > SWIPE_PX) goTo(current + (diff < 0 ? 1 : -1))
      }}
    >
      <div className="home-slider-track" aria-live={playing ? 'off' : 'polite'}>
        {slides.map((slide, i) => {
          const active = i === current
          const Heading = i === 0 ? 'h1' : 'h2'
          const full = slide.background != null
          const copy = slide.copyHidden ? ' sr-only' : ''
          return (
            <div
              key={slide.key}
              id={`home-slide-${slide.key}`}
              role="group"
              aria-roledescription="slide"
              aria-label={labels.slideLabels[i]}
              aria-hidden={!active}
              inert={!active}
              className={`home-slide home-slide-${slide.theme}${active ? ' is-active' : ''}${
                full ? ` home-slide-full home-tone-${slide.tone ?? 'dark'}` : ''
              }${slide.copyHidden ? ' is-copy-hidden' : ''}`}
            >
              {full ? <div className="home-slide-bg">{slide.background}</div> : null}
              <div className="container-page home-slide-inner">
                <div className="home-slide-grid">
                  <div className="home-slide-text">
                    <Heading className={'home-slide-title' + copy} lang={slide.titleLang ?? 'en'}>
                      {slide.title}
                    </Heading>
                    {slide.headline ? (
                      <p className={'home-slide-headline' + copy}>{slide.headline}</p>
                    ) : null}
                    {slide.description ? (
                      <div className={'home-slide-desc' + copy}>{slide.description}</div>
                    ) : null}
                    <Link href={slide.cta.href} className="home-slide-cta">
                      <span>{slide.cta.label}</span>
                      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path
                          d="M3 8h10M9 4l4 4-4 4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  </div>
                  {full ? null : <div className="home-slide-visual">{slide.visual}</div>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="home-slider-controls" role="group" aria-label={labels.controls}>
        <div className="home-slider-dots" role="group" aria-label={labels.chooseSlide}>
          {slides.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              className="home-slider-dot"
              aria-label={labels.dotLabels[i]}
              aria-controls={`home-slide-${slide.key}`}
              aria-current={i === current ? 'true' : undefined}
              onClick={() => goTo(i)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="home-slider-play"
          aria-label={pause.userPaused ? labels.play : labels.pause}
          onClick={() => dispatch({ type: 'togglePause' })}
        >
          {pause.userPaused ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 4l14 8-14 8V4z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </section>
  )
}
