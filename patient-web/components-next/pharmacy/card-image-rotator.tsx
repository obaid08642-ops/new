"use client";

import { useEffect, useRef } from "react";
import { reducedMotion } from "@/lib/motion/motion";
import { shouldRotate, type Rotation } from "./card-rotation";

/**
 * Draws nothing. Placed inside a product card's picture box, it makes the card turn through `srcs` (the first is the picture
 * already there) while the card is on screen. The turning code is fetched only when the card first comes into view, so the page's
 * script is not larger for it; with reduced motion nothing is fetched and nothing turns.
 */
export function CardImageRotator({ srcs }: { srcs: string[] }) {
  const marker = useRef<HTMLSpanElement>(null);
  const key = srcs.join("|");
  useEffect(() => {
    const media = marker.current?.parentElement;
    const list = key.split("|");
    if (!media || !shouldRotate(list.length, reducedMotion()) || typeof IntersectionObserver === "undefined") return;
    let rotation: Rotation | null = null;
    let gone = false;
    const watcher = new IntersectionObserver((entries) => {
      const on = entries.some((entry) => entry.isIntersecting);
      if (on && !rotation) {
        void import("./card-rotation").then((m) => {
          if (gone) return;
          rotation = m.startRotation(media, list);
          rotation?.setVisible(true);
        });
      } else rotation?.setVisible(on);
    }, { threshold: 0.4 });
    watcher.observe(media);
    return () => { gone = true; watcher.disconnect(); rotation?.stop(); };
  }, [key]);
  return <span ref={marker} hidden />;
}
