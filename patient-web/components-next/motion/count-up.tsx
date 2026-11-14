"use client";

import { useEffect, useRef, useState } from "react";
import { MOTION, reducedMotion } from "@/lib/motion/motion";
import { formatNumber } from "@/lib/format-price";

/** The eased value at `progress` (0..1) between two numbers, rounded to whole units. */
export function countUpValue(from: number, to: number, progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const eased = 1 - Math.pow(1 - p, 3);
  return Math.round(from + (to - from) * eased);
}

/**
 * A number that counts to its new value when it changes (the cart's total), over MOTION.toast ms. The first paint, and every
 * change with reduced motion, is the value itself; a screen reader is told the final value only (the counting is hidden).
 */
export function CountUp({ value, locale }: { value: number; locale: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reducedMotion() || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const progress = (now - start) / MOTION.toast;
      setShown(countUpValue(origin, value, progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); from.current = shown; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restarts only when the target value changes
  }, [value]);
  return (
    <>
      <span aria-hidden="true">{formatNumber(locale, shown)}</span>
      <span className="sr-only">{formatNumber(locale, value)}</span>
    </>
  );
}
