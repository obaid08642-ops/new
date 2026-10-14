"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

/** A page younger than this (server clock to client clock) is fresh; older means it came from the router cache. */
const MAX_AGE_MS = 5000;
/** Tolerated clock difference; a client clock further behind than this cannot be trusted, so the page is refreshed. */
const SKEW_MS = 1500;

/** True when a page rendered at `renderedAt` (server clock) has been in the router cache long enough to revalidate. */
export function needsRevalidation(renderedAt: number, now: number): boolean {
  const age = now - renderedAt;
  return age > MAX_AGE_MS || age < -SKEW_MS;
}

const noSubscription = () => () => {};

/**
 * Stale-while-revalidate for a list page the router served from its cache (a prefetch made before the click):
 * the cached page is on screen at once, and one `router.refresh()` swaps in the current data in place (scroll and
 * client state are kept). Nothing happens when the page was just rendered, or when it came in the HTML document itself.
 */
export function RevalidateStale({ renderedAt }: { renderedAt: number }) {
  const router = useRouter();
  // True while React hydrates the server-rendered document, false for a component mounted by a client transition.
  const hydrating = useSyncExternalStore(noSubscription, () => false, () => true);
  useEffect(() => {
    if (hydrating) return;
    if (needsRevalidation(renderedAt, Date.now())) router.refresh();
    // Once per mount: a refresh brings a new `renderedAt` to the same instance and must not start another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
