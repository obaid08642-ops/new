"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * F82-1: WebMCP registers tools for in-browser assistants. Nothing on the page needs it, so it is
 * fetched after the browser is idle (3.4 KB gz and its descriptions are out of the first load).
 */
export function WebMcpLoader({ locale }: { locale: Locale }) {
  const [Provider, setProvider] = useState<ComponentType<{ locale: Locale }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void import("./web-mcp-provider").then((mod) => {
        if (!cancelled) setProvider(() => mod.WebMcpProvider);
      });
    };
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(load, { timeout: 5000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(handle);
      };
    }
    const handle = window.setTimeout(load, 3000);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, []);

  return Provider ? <Provider locale={locale} /> : null;
}
