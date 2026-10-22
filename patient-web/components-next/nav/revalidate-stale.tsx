"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

/** A page rendered per request that is older than this (server clock to client clock) came from the router cache. */
export const MAX_AGE_MS = 5000;
/** Tolerated clock difference; a client clock further behind than this cannot be trusted, so the page is refreshed. */
const SKEW_MS = 1500;

/**
 * True when a page rendered at `renderedAt` (server clock) has been around long enough to revalidate.
 * `maxAgeMs` is the page's own freshness window: a few seconds for a page rendered per request, its `revalidate` window
 * for a static/ISR page (F82-3, where `renderedAt` is the generation time of the cached copy).
 */
export function needsRevalidation(renderedAt: number, now: number, maxAgeMs: number = MAX_AGE_MS): boolean {
  const age = now - renderedAt;
  return age > maxAgeMs || age < -SKEW_MS;
}

const noSubscription = () => () => {};

/**
 * Stale-while-revalidate for a list page the router served from its cache (a prefetch made before the click):
 * the cached page is on screen at once, and one `router.refresh()` swaps in the current data in place (scroll and
 * client state are kept). Nothing happens when the page was just rendered, or when it came in the HTML document itself.
 */
export function RevalidateStale({ renderedAt, maxAgeMs }: { renderedAt: number; maxAgeMs?: number }) {
  const router = useRouter();
  // True while React hydrates the server-rendered document, false for a component mounted by a client transition.
  const hydrating = useSyncExternalStore(noSubscription, () => false, () => true);
  useEffect(() => {
    if (hydrating) return;
    if (needsRevalidation(renderedAt, Date.now(), maxAgeMs)) router.refresh();
    // Once per mount: a refresh brings a new `renderedAt` to the same instance and must not start another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
