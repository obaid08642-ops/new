/**
 * The shared motion values of the website (owner, 2026-10-26): every duration and easing a script animates with, in one place, and the
 * one check every animation makes first. Nothing here moves under `prefers-reduced-motion` (see `reducedMotion`).
 * Durations in milliseconds. The design tokens (packages/design-tokens `motion`) own press, enter, enterMax and the easing; the CSS
 * files read them as `--nabd-motion-*` and these numbers repeat them for scripts (the Web Animations API takes no `var()`), pinned to
 * the tokens by tests/motion-tokens.test.ts so they cannot drift. `flight` and `fade` are the two the tokens do not have.
 */
export const MOTION = {
  /** a press: scale 0.97 */
  /** token motion.duration.press */
  press: 120,
  /** the cart badge's and the heart's pop (scale 1 -> 1.2 -> 1): token motion.duration.enter */
  pop: 200,
  /** the product image flying to the cart icon (300 to 450 ms) */
  flight: 380,
  /** a toast sliding in, a number counting up: token motion.duration.enterMax */
  toast: 240,
  /** a crossfade between images */
  fade: 300,
  /** ease-out: token motion.easing.enter */
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

/** True when the visitor asked for less motion: no flight, no pop, no slide; the state still changes. */
export function reducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
