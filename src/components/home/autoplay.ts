/**
 * Autoplay pause sources for the home slider. Each source is tracked on its own so that clearing
 * one (e.g. focus leaving) can never clear another (e.g. the pointer still over the slider).
 */
export type AutoplayState = {
  /** Pointer (mouse or pen) is over the slider. */
  hover: boolean
  /** Keyboard focus is inside the slider. */
  focus: boolean
  /** The visitor chose Pause; only the Play/Pause button changes this. */
  userPaused: boolean
  /** prefers-reduced-motion: reduce. */
  reducedMotion: boolean
}

export type AutoplayAction =
  | { type: 'hover' | 'focus' | 'reducedMotion'; value: boolean }
  | { type: 'togglePause' }

export const initialAutoplayState: AutoplayState = {
  hover: false,
  focus: false,
  userPaused: false,
  reducedMotion: false,
}

export function autoplayReducer(state: AutoplayState, action: AutoplayAction): AutoplayState {
  if (action.type === 'togglePause') return { ...state, userPaused: !state.userPaused }
  if (state[action.type] === action.value) return state
  return { ...state, [action.type]: action.value }
}

/** Autoplay runs only when no pause source is active. */
export const isAutoplaying = (state: AutoplayState, slideCount: number) =>
  slideCount > 1 && !state.hover && !state.focus && !state.userPaused && !state.reducedMotion
