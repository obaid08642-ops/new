"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-reads the page's server data every `seconds` (the app polls a visit's status every 30 s); stops when the tab is hidden. */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
