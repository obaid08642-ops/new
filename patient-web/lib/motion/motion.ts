/**
 * The shared motion tokens (owner, 2026-10-26): every duration and easing the website animates with, in one place, and the
 * one check every animation makes first. Nothing here moves under `prefers-reduced-motion` (see `reducedMotion`).
 * Durations in milliseconds; the CSS files use the same numbers through `--nabd-motion-*` where they animate in CSS.
 */
export const MOTION = {
  /** a press: scale 0.97 */
  press: 120,
  /** the cart badge's pop (scale 1 -> 1.2 -> 1) */
  pop: 220,
  /** the product image flying to the cart icon (300 to 450 ms) */
  flight: 380,
  /** a toast sliding in */
  toast: 240,
  /** a crossfade between images */
  fade: 300,
  /** ease-out */
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

/** True when the visitor asked for less motion: no flight, no pop, no slide; the state still changes. */
export function reducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
