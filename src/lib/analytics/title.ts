/**
 * After a client-side navigation Next.js updates <title> a little after the page's effects run,
 * so reading document.title right away often yields the previous page's title or nothing.
 * `whenTitleReady` calls `send` exactly once with the new page's title:
 * - immediately when the title already differs from the last page view's title (first load,
 *   or Next already updated it);
 * - otherwise on the next <title> change;
 * - otherwise after `timeoutMs` (two pages that legitimately share a title).
 * The returned function cancels a pending send (route changed again, or React Strict Mode
 * re-running the effect); the dispatcher's page dedup covers any repeat.
 */
export type TitleEnv = {
  getTitle: () => string
  /** Subscribes to <title> changes; returns an unsubscribe function. */
  observe: (onChange: () => void) => () => void
  setTimer: (fn: () => void, ms: number) => unknown
  clearTimer: (handle: unknown) => void
}

export function whenTitleReady(send: (title: string) => void, previousTitle: string | null, env: TitleEnv, timeoutMs = 1000) {
  const current = env.getTitle()
  if (previousTitle === null || (current && current !== previousTitle)) {
    send(current)
    return () => {}
  }
  let done = false
  let unsubscribe: () => void = () => {}
  const finish = () => {
    if (done) return
    done = true
    unsubscribe()
    env.clearTimer(timer)
    send(env.getTitle())
  }
  unsubscribe = env.observe(() => {
    const title = env.getTitle()
    if (title && title !== previousTitle) finish()
  })
  const timer = env.setTimer(finish, timeoutMs)
  return () => {
    if (done) return
    done = true
    unsubscribe()
    env.clearTimer(timer)
  }
}

/** Browser implementation: watches <head> for <title> insertion or text changes. */
export const browserTitleEnv = (): TitleEnv => ({
  getTitle: () => document.title,
  observe: (onChange) => {
    const observer = new MutationObserver(onChange)
    observer.observe(document.head, { subtree: true, childList: true, characterData: true })
    return () => observer.disconnect()
  },
  setTimer: (fn, ms) => window.setTimeout(fn, ms),
  clearTimer: (handle) => window.clearTimeout(handle as number),
})
