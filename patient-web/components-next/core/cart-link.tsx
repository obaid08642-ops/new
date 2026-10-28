"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
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
 * on a page where something can be added it opens that service's cart and its badge counts that service only; on every
 * other page (Home, consultations, the doctor profile, the account) it draws nothing while all carts are empty, and otherwise
 * a button with the total that opens a "Your carts" list of the non-empty carts (owner, 2026-10-27). The counts come from this browser's
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
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  // the sheet is drawn on <body>: a header with a blur or transform would otherwise become the 'fixed' box of the sheet
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [phone, setPhone] = useState(false);
  useEffect(() => { const q = window.matchMedia("(max-width: 767px)"); const on = () => setPhone(q.matches); on(); q.addEventListener("change", on); return () => q.removeEventListener("change", on); }, []);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const away = (event: Event) => { const node = event.target as Node; if (!wrap.current?.contains(node) && !menu.current?.contains(node)) setOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    menu.current?.querySelector<HTMLElement>("a")?.focus();
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  if (target.kind === "none") return null;
  const label = target.count > 0 ? shell("cartCount", { n: target.count }) : shell("cart");
  const buttonClass = className || `${styles.iconLink} ${styles.cartLink}`;
  const badge = target.count > 0 ? <span className={badgeClassName || styles.cartBadge} aria-hidden="true" data-testid="cart-badge">{formatNumber(locale, target.count)}</span> : null;
  if (target.kind === "cart") {
    return (
      <Link href={target.href} className={buttonClass} data-testid="cart-link" data-cart-service={target.service} aria-label={label}>
        <Icon name="cart" size={20} tone="currentColor" />
        {badge}
      </Link>
    );
  }
  const sheet = (
    <>
      <span className={styles.cartBackdrop} aria-hidden="true" data-testid="cart-backdrop" onClick={() => { setOpen(false); button.current?.focus(); }} />
      <ul ref={menu} id={menuId} className={styles.cartMenu} aria-label={shell("cartChooser")} data-testid="cart-chooser">
        <li role="presentation" className={styles.cartMenuTitle} aria-hidden="true">{shell("cartChooser")}</li>
        {target.carts.map((cart) => (
          <li key={cart.service}>
            <Link href={cart.href} className={styles.cartMenuItem} data-cart-service={cart.service} onClick={() => setOpen(false)}>
              <span>{shell(NAME_KEY[cart.service])}</span>
              <span className={styles.cartMenuCount}>{formatNumber(locale, cart.count)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
  return (
    <span ref={wrap} className={styles.cartWrap}>
      <button ref={button} type="button" className={buttonClass} data-testid="cart-link" data-cart-service="chooser" aria-label={label} aria-haspopup="true" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((v) => !v)}>
        <Icon name="cart" size={20} tone="currentColor" />
        {badge}
      </button>
      {open ? (phone && mounted ? createPortal(sheet, document.body) : sheet) : null}
    </span>
  );
}
