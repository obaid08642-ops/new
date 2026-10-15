"use client";

import { useEffect } from "react";

/**
 * journeys#77: registers the site's service worker (public/sw.js) quietly, with no permission prompt, so a page that
 * cannot load offline shows the site's own offline page instead of the browser's error page. Web push subscribes
 * through the same worker only when the patient turns it on (lib/web-push.ts).
 */
export function OfflineSupport() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
