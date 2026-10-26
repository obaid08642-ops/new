"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { useBasket } from "@/components-next/ordering/use-basket";
import { useCart } from "@/lib/context/CartContext";
import { cartTarget, serviceOfPath, type CartCounts, type CartService } from "@/lib/cart/service-carts";
import { formatNumber } from "@/lib/format-price";
import type { Locale } from "@/lib/i18n";
import styles from "./core.module.css";

const NAME_KEY: Record<CartService, "cartPharmacy" | "cartLab" | "cartRadiology" | "cartNursing"> = {
  pharmacy: "cartPharmacy", lab: "cartLab", radiology: "cartRadiology", nursing: "cartNursing",
};

/**
 * The one cart button of the patient-web headers (core shell and home). One cart per service (lib/cart/service-carts.ts):
 * on a service page it opens that service's cart and its badge counts that service only; on Home (and any page of no
 * service) it opens a chooser of the carts that are not empty, each with its count. The counts come from this browser's
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
  const count = target.count;
  const label = count > 0 ? shell("cartCount", { n: count }) : shell("cart");
  const buttonClass = className || `${styles.iconLink} ${styles.cartLink}`;
  const badge = count > 0 ? <span className={badgeClassName || styles.cartBadge} aria-hidden="true" data-testid="cart-badge">{formatNumber(locale, count)}</span> : null;

  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (event: Event) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (target.kind === "cart") {
    return (
      <Link href={target.href} className={buttonClass} data-testid="cart-link" data-cart-service={target.service} aria-label={label}>
        <Icon name="cart" size={20} tone="currentColor" />
        {badge}
      </Link>
    );
  }
  return (
    <span ref={wrap} className={styles.cartWrap}>
      <button type="button" className={buttonClass} data-testid="cart-link" data-cart-service="chooser" aria-label={label} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon name="cart" size={20} tone="currentColor" />
        {badge}
      </button>
      {open ? (
        <ul className={styles.cartMenu} aria-label={shell("cartChooser")} data-testid="cart-chooser">
          {target.carts.map((cart) => (
            <li key={cart.service}>
              <Link href={cart.href} className={styles.cartMenuItem} data-cart-service={cart.service} onClick={() => setOpen(false)}>
                <span>{shell(NAME_KEY[cart.service])}</span>
                <span className={styles.cartMenuCount}>{formatNumber(locale, cart.count)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </span>
  );
}
