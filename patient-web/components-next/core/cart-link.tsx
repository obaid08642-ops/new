"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { useCart } from "@/lib/context/CartContext";
import { formatNumber } from "@/lib/format-price";
import type { Locale } from "@/lib/i18n";
import styles from "./core.module.css";

/**
 * The one cart button of the patient-web headers (core shell and home): the cart icon with the item count of this
 * browser's local-first cart (lib/context/CartContext), so an add or a remove shows in the same tick.
 */
export function CartLink({ locale, className = "", badgeClassName = "" }: { locale: Locale; className?: string; badgeClassName?: string }) {
  const shell = useTranslations("CoreShell");
  const { itemCount } = useCart();
  return (
    <Link
      href={`/${locale}/cart`}
      className={className || `${styles.iconLink} ${styles.cartLink}`}
      data-testid="cart-link"
      aria-label={itemCount > 0 ? shell("cartCount", { n: itemCount }) : shell("cart")}
    >
      <Icon name="cart" size={20} tone="currentColor" />
      {itemCount > 0 ? (
        <span className={badgeClassName || styles.cartBadge} aria-hidden="true" data-testid="cart-badge">{formatNumber(locale, itemCount)}</span>
      ) : null}
    </Link>
  );
}
