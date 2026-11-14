"use client";

import { useCallback, useState } from "react";
import { showBackToTop } from "@/lib/navigation/scroll";
import { useWindowScroll } from "@/components-next/navigation/use-window-scroll";

/** A round button in the corner that scrolls the page back to the top; it appears only after the reader has scrolled down. */
export function BackToTop({ label }: Readonly<{ label: string }>) {
  const [visible, setVisible] = useState(false);
  const update = useCallback(() => setVisible(showBackToTop(window.scrollY)), []);
  useWindowScroll(update);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="back-to-top"
      aria-label={label}
      title={label}
      onClick={() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // The button unmounts once the page is back at the top, so move focus to the content first (not to <body>).
        document.getElementById("main-content")?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }}
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
