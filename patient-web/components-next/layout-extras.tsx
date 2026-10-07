"use client";

import { useEffect } from "react";
import { ScrollProgress } from "@/components-next/scroll-progress";
import { BackToTop } from "@/components-next/back-to-top";

export function LayoutExtras() {
  // Prevent flash of scroll progress on SSR
  useEffect(() => {
    document.documentElement.style.setProperty("--scroll-progress-ready", "1");
  }, []);

  return (
    <>
      <ScrollProgress excludeSelectors={["header", "footer", "[data-skip-progress]"]} />
      <BackToTop threshold={300} />
    </>
  );
}