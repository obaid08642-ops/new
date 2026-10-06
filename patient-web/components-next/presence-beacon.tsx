"use client";

import { useEffect } from "react";
import { useSessionIdentity } from "@/lib/auth/session-identity";

/**
 * Cross-platform online presence (admin/analytics/online).
 * Posts an authenticated heartbeat every 60s while the tab is visible.
 * Silent when logged out (401 ignored). Observability only.
 * F82-3: the layout is static (the same HTML for everyone), so the beacon starts only once the session identity says
 * the visitor is signed in.
 */
export function PresenceBeacon() {
  const { status } = useSessionIdentity();
  useEffect(() => {
    if (status !== "authenticated") return undefined;
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
  }, [status]);
  return null;
}
