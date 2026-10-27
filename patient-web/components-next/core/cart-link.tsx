"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { useBasket } from "@/components-next/ordering/use-basket";
import { useCart } from "@/lib/context/CartContext";
import { cartTarget, serviceOfPath, type CartCounts } from "@/lib/cart/service-carts";
import { formatNumber } from "@/lib/format-price";
import type { Locale } from "@/lib/i18n";
import styles from "./core.module.css";

/**
 * The one cart button of the patient-web headers (core shell and home). One cart per service (lib/cart/service-carts.ts):
 * on a page where something can be added it opens that service's cart and its badge counts that service only; on every
 * other page (Home, consultations, the doctor profile, the account) it draws nothing (owner review 2026-10-27, G1). The counts come from this browser's
 * local-first stores (pharmacy cart context and the ordering basket), so an add or a remove shows in the same tick.
 */
export function CartLink({ locale, className = "", badgeClassName = "" }: { locale: Locale; className?: string; badgeClassName?: string }) {
  const shell = useTranslations("CoreShell");
  const pathname = usePathname() ?? "";
  const { itemCount } = useCart();
  const { basket } = useBasket();
  // the basket page serves three services by `?kind=`; read it after mount so the first paint matches the server's
  const [kind, setKind] = useState<string | null>(null);
  useEffect(() => { setKind(new URLSearchParams(window.location.search).get("kind")); }, [pathname]);
  const counts: CartCounts = { pharmacy: itemCount, lab: basket.lab.length, radiology: basket.radiology.length, nursing: basket.nursing.length };
  const target = cartTarget(serviceOfPath(pathname, kind), counts, locale);
  if (target.kind === "none") return null;
  const label = target.count > 0 ? shell("cartCount", { n: target.count }) : shell("cart");
  const buttonClass = className || `${styles.iconLink} ${styles.cartLink}`;
  return (
    <Link href={target.href} className={buttonClass} data-testid="cart-link" data-cart-service={target.service} aria-label={label}>
      <Icon name="cart" size={20} tone="currentColor" />
      {target.count > 0 ? <span className={badgeClassName || styles.cartBadge} aria-hidden="true" data-testid="cart-badge">{formatNumber(locale, target.count)}</span> : null}
    </Link>
  );
}
