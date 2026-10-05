"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { ambientPrefetchAllowed, isFullPrefetchRoute, onIdle } from "@/lib/nav/prefetch-routes";

// `router.prefetch` types its option as the PrefetchKind enum; its runtime value for a full prefetch is "full".
const FULL = "full" as PrefetchKind;

/**
 * Full prefetch for navigation that goes through `router.push` instead of a link (the phone tab bar's buttons are
 * buttons, so Next never sees them as links). Fires once the page is idle, only for routes that are safe to prefetch
 * in full, and not on Save-Data or 2G.
 */
export function useRoutePrefetch(hrefs: readonly string[], opts: { signedIn?: boolean } = {}): void {
  const router = useRouter();
  const key = hrefs.join("|");
  const signedIn = Boolean(opts.signedIn);
  useEffect(() => {
    const targets = key.split("|").filter((href) => isFullPrefetchRoute(href, { signedIn }));
    if (targets.length === 0) return undefined;
    return onIdle(() => {
      if (!ambientPrefetchAllowed()) return;
      for (const href of targets) router.prefetch(href, { kind: FULL });
    });
  }, [key, router, signedIn]);
}
