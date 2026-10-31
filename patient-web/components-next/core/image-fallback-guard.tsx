"use client";

import { useEffect } from "react";
import { originalOf } from "@/lib/media/image-fallback";

/**
 * One capture-phase `error` listener for the whole page (image errors do not bubble): an optimized picture that failed (504 from a slow origin)
 * is swapped once to the original on the CDN, and srcset is dropped so the browser does not retry the same optimizer URL.
 */
export function ImageFallbackGuard() {
  useEffect(() => {
    const onError = (event: Event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.fellBack === "1") return;
      const original = originalOf(img.currentSrc || img.src);
      if (!original) return;
      img.dataset.fellBack = "1";
      img.removeAttribute("srcset");
      img.src = original;
    };
    document.addEventListener("error", onError, true);
    return () => document.removeEventListener("error", onError, true);
  }, []);
  return null;
}
