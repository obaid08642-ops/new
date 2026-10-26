import { AccessibilityInfo } from 'react-native';

/**
 * The shared motion tokens (owner, 2026-10-26): every duration the app animates with, in one place (the website's
 * lib/motion/motion.ts has the same numbers). Nothing moves when the system asks for reduced motion (`reduceMotion`).
 */
export const MOTION = {
  /** a press: scale 0.97 */
  press: 120,
  /** the cart badge's pop (scale 1 -> 1.2 -> 1) */
  pop: 220,
  /** the product picture flying to the cart icon (300 to 450 ms) */
  flight: 380,
  /** a toast sliding in */
  toast: 240,
  /** a crossfade between images */
  fade: 300,
} as const;

let reduced = false;
let watching = false;

/** True when the system asks for less motion. Read once at first use, then kept current by the system's change event. */
export function reduceMotion(): boolean {
  if (!watching) {
    watching = true;
    try {
      void AccessibilityInfo.isReduceMotionEnabled().then((on) => { reduced = on; }).catch(() => undefined);
      AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => { reduced = on; });
    } catch {
      /* no accessibility service: motion stays on */
    }
  }
  return reduced;
}

/** For tests: set the answer without the system. */
export function setReduceMotionForTest(value: boolean): void {
  watching = true;
  reduced = value;
}
