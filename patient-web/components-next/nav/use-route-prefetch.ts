"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { isFullPrefetchRoute } from "@/lib/nav/prefetch-routes";

// `router.prefetch` types its option as the PrefetchKind enum; its runtime value for a full prefetch is "full".
const FULL = "full" as PrefetchKind;

/**
 * Full prefetch for navigation that goes through `router.push` instead of a link (the phone tab bar's buttons are
 * buttons, so Next never sees them as links). The page of tab `i` is fetched when the pointer, a finger or the keyboard
 * reaches the bar's button `i` (the bar draws one button per item, in order), and only for routes that are safe to
 * prefetch in full. Nothing is fetched ahead of that intent: an idle-time prefetch of every tab downloaded the other
 * pages' scripts on every page view (26 KB on /ar/c, over the 170 KB script budget; owner decision 45, issue 427).
 */
export function useRoutePrefetch(hrefs: readonly string[], opts: { signedIn?: boolean } = {}): void {
  const router = useRouter();
  const key = hrefs.join("|");
  const signedIn = Boolean(opts.signedIn);
  useEffect(() => {
    const list = key.split("|");
    if (!list.some((href) => isFullPrefetchRoute(href, { signedIn }))) return undefined;
    const done = new Set<string>();
    const onIntent = (event: Event) => {
      const button = event.target instanceof Element ? event.target.closest(".nabd-bottom-tab-bar > button") : null;
      if (!button?.parentElement) return;
      const href = list[Array.prototype.indexOf.call(button.parentElement.children, button)];
      if (!href || done.has(href) || !isFullPrefetchRoute(href, { signedIn })) return;
      done.add(href);
      router.prefetch(href, { kind: FULL });
    };
    const events = ["pointerover", "pointerdown", "focusin"] as const;
    for (const name of events) document.addEventListener(name, onIntent, { passive: true });
    return () => { for (const name of events) document.removeEventListener(name, onIntent); };
  }, [key, router, signedIn]);
}
