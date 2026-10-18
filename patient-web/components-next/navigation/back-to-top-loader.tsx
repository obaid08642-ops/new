"use client";

import { useEffect, useState, type ComponentType } from "react";
import { showBackToTop } from "@/lib/navigation/scroll";

type ButtonProps = Readonly<{ label: string }>;

/**
 * Loads the back-to-top button only once the reader first scrolls past the threshold, so its code is not part of the
 * initial JavaScript of every page (the first-load budget in patient-web/.github/lighthouse-budget.json).
 */
export function BackToTopLoader({ label }: ButtonProps) {
  const [Button, setButton] = useState<ComponentType<ButtonProps> | null>(null);

  useEffect(() => {
    if (Button) return;
    const onScroll = () => {
      if (!showBackToTop(window.scrollY)) return;
      window.removeEventListener("scroll", onScroll);
      void import("@/components-next/navigation/back-to-top").then((m) => setButton(() => m.BackToTop));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [Button]);

  return Button ? <Button label={label} /> : null;
}
