"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * F82-1: WebMCP registers tools for in-browser assistants. Nothing on the page needs it, so it is
 * fetched a few seconds after the page has loaded, when the browser is idle (3.4 KB gz and its descriptions are
 * out of the first load).
 */
export function WebMcpLoader({ locale }: { locale: Locale }) {
  const [Provider, setProvider] = useState<ComponentType<{ locale: Locale }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let idle = 0;
    let timer = 0;
    const load = () => {
      void import("./web-mcp-provider").then((mod) => {
        if (!cancelled) setProvider(() => mod.WebMcpProvider);
      });
    };
    // After the page has loaded, wait a few seconds, then wait for an idle moment: nothing on the page needs the
    // tools, and they must not compete with the first paint, hydration or the viewport prefetches.
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(load, { timeout: 5000 });
        else load();
      }, 3000);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      window.clearTimeout(timer);
      if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
    };
  }, []);

  return Provider ? <Provider locale={locale} /> : null;
}
