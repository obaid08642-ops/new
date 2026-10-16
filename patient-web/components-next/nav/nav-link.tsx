"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";
import { useSessionIdentity } from "@/lib/auth/session-identity";
import { dependsOnSession, isFullPrefetchRoute } from "@/lib/nav/prefetch-routes";

type LinkProps = ComponentProps<typeof Link>;

export type NavLinkProps = Omit<LinkProps, "prefetch"> & {
  /**
   * The visitor has a session; `/diagnostics` is per-patient then and stays out of the full prefetch. Leave it out on a
   * static page (F82-3): the link then asks the session identity in the browser, only when its own route depends on it,
   * and treats `unknown` as signed in until the answer arrives.
   */
  signedIn?: boolean;
};

/**
 * `next/link` that upgrades its prefetch to the full page, for the routes that are safe to prefetch in full, when the
 * pointer, a finger or the keyboard reaches the link. Any other href behaves exactly like a plain `next/link` (Next
 * prefetches the shell only). No page is fetched in full ahead of that intent (owner decision 45, issue 427: an
 * idle-time prefetch downloaded other pages' scripts on every page view).
 */
export function NavLink({ signedIn, href, onMouseEnter, onTouchStart, onFocus, ...rest }: NavLinkProps) {
  const needsIdentity = signedIn === undefined && typeof href === "string" && dependsOnSession(href);
  const identity = useSessionIdentity({ enabled: needsIdentity });
  const visitorSignedIn = signedIn ?? identity.status !== "anonymous";
  const eligible = typeof href === "string" && isFullPrefetchRoute(href, { signedIn: visitorSignedIn });
  const [full, setFull] = useState(false);

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
