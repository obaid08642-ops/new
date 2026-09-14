"use client";

import { useEffect } from "react";

/**
 * Cross-platform online presence (admin/analytics/online).
 * Posts an authenticated heartbeat every 60s while the tab is visible.
 * Silent when logged out (401 ignored). Observability only.
 */
export function PresenceBeacon() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const post = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/auth/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client: "patient-web" }),
      }).catch(() => null);
    };
    post();
    timer = setInterval(post, 60000);
    const onVis = () => post();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return null;
}
