"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { useSessionIdentity } from "@/lib/auth/session-identity";
import { formatNumber } from "@/lib/format-price";
import type { Locale } from "@/lib/i18n";
import styles from "./core.module.css";

/**
 * The favourites (wishlist) button of the patient-web headers, next to the cart and with the same badge: the heart icon
 * linking to /wishlist, with the number of saved items read from `GET /users/me/wishlist` (the call the product heart
 * uses). The call is made only for a signed-in patient (the session identity every header already shares): a visitor or a
 * guest account never calls it (it would answer 401), and a failed call shows the icon without a badge; the wishlist page
 * itself sends a visitor to sign in. The count is read again when the page changes, so a heart pressed on a product shows on the next page.
 */
// no zod here: this button is in every header, and the client bundles must not reach zod (tests/pharmacy-rx.test.tsx)
function savedCount(payload: unknown): number {
  const root = payload && typeof payload === "object" ? (payload as { data?: unknown; items?: unknown }) : null;
  const list = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? root.data : Array.isArray(root?.items) ? root.items : [];
  return list.filter((entry) => entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string").length;
}

export function WishlistLink({ locale, className = "", badgeClassName = "" }: { locale: Locale; className?: string; badgeClassName?: string }) {
  const shell = useTranslations("CoreShell");
  const pathname = usePathname();
  const identity = useSessionIdentity();
  const canRead = identity.status === "user" && !identity.isGuest;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!canRead) { setCount(0); return; }
    let active = true;
    fetch("/api/patient/users/me/wishlist", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) return setCount(0);
        const total = savedCount(await response.json().catch(() => null));
        if (active) setCount(total);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [pathname, canRead]);

  return (
    <Link
      href={`/${locale}/wishlist`}
      className={className || `${styles.iconLink} ${styles.cartLink}`}
      data-testid="wishlist-link"
      aria-label={count > 0 ? shell("wishlistCount", { n: count }) : shell("wishlist")}
    >
      <Icon name="heart" size={20} tone="currentColor" />
      {count > 0 ? (
        <span className={badgeClassName || styles.cartBadge} aria-hidden="true" data-testid="wishlist-badge">{formatNumber(locale, count)}</span>
      ) : null}
    </Link>
  );
}
