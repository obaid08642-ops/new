"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";
import { useSessionIdentity } from "@/lib/auth/session-identity";
import { ambientPrefetchAllowed, dependsOnSession, isFullPrefetchRoute, onIdle } from "@/lib/nav/prefetch-routes";

type LinkProps = ComponentProps<typeof Link>;

export type NavLinkProps = Omit<LinkProps, "prefetch"> & {
  /**
   * `viewport`: besides the shell prefetch Next does for every link in the viewport, fetch the page itself once the
   * page is idle (main routes: tab bar, section nav, service tiles).
   * `intent` (default): fetch the page itself when the pointer, a finger or the keyboard reaches the link.
   * Either way only routes in `lib/nav/prefetch-routes.ts` are fetched in full; any other href behaves exactly like
   * a plain `next/link` (prefetch the shell only).
   */
  prefetch?: "viewport" | "intent";
  /**
   * The visitor has a session; `/diagnostics` is per-patient then and stays out of the full prefetch. Leave it out on a
   * static page (F82-3): the link then asks the session identity in the browser, only when its own route depends on it,
   * and treats `unknown` as signed in until the answer arrives.
   */
  signedIn?: boolean;
};

/** `next/link` that upgrades its prefetch to the full page for the routes that are safe to prefetch in full. */
export function NavLink({ prefetch = "intent", signedIn, href, onMouseEnter, onTouchStart, onFocus, ...rest }: NavLinkProps) {
  const needsIdentity = signedIn === undefined && typeof href === "string" && dependsOnSession(href);
  const identity = useSessionIdentity({ enabled: needsIdentity });
  const visitorSignedIn = signedIn ?? identity.status !== "anonymous";
  const eligible = typeof href === "string" && isFullPrefetchRoute(href, { signedIn: visitorSignedIn });
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!eligible || prefetch !== "viewport") return undefined;
    return onIdle(() => { if (ambientPrefetchAllowed()) setFull(true); });
  }, [eligible, prefetch]);

  const upgrade = () => { if (eligible) setFull(true); };
  return (
    <Link
      {...rest}
      href={href}
      prefetch={full ? true : null}
      onMouseEnter={(event) => { onMouseEnter?.(event); upgrade(); }}
      onTouchStart={(event) => { onTouchStart?.(event); upgrade(); }}
      onFocus={(event) => { onFocus?.(event); upgrade(); }}
    />
  );
}
