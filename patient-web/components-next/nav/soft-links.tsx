"use client";

import { useRouter } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import type { ComponentPropsWithoutRef, MouseEvent, SyntheticEvent } from "react";
import { isFullPrefetchRoute } from "@/lib/nav/prefetch-routes";

const FULL = "full" as PrefetchKind;

type Props = Omit<ComponentPropsWithoutRef<"ul">, "onClick" | "onMouseOver" | "onTouchStart" | "onFocus">;

/** The same-origin page path an event's anchor points at, or null when the browser should handle it. */
function internalHref(event: SyntheticEvent): string | null {
  const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return null;
  return url.pathname + url.search + url.hash;
}

/**
 * A list whose items are plain `<a href>` links drawn by the shared design components (the doctor card), which cannot
 * use `next/link`. A click becomes a client transition instead of a full page load, and hover, touch and focus prefetch
 * the page (in full for the routes `lib/nav/prefetch-routes.ts` allows).
 */
export function SoftLinks(props: Props) {
  const router = useRouter();
  const intent = (event: SyntheticEvent) => {
    const href = internalHref(event);
    if (!href) return;
    if (isFullPrefetchRoute(href)) router.prefetch(href, { kind: FULL });
    else router.prefetch(href);
  };
  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = internalHref(event);
    if (!href) return;
    event.preventDefault();
    router.push(href);
  };
  return <ul {...props} onClick={click} onMouseOver={intent} onTouchStart={intent} onFocus={intent} />;
}
