"use client";

import { useEffect } from "react";

/**
 * Runs `onScroll` once now and again for each scroll or resize, at most once per animation frame, so a fast scroll does
 * not re-render on every event. `onScroll` must be stable (wrap it in useCallback).
 */
export function useWindowScroll(onScroll: () => void): void {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        onScroll();
      });
    };
    onScroll();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [onScroll]);
}
