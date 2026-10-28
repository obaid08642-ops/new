"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { CartService } from "@/lib/cart/service-carts";
import { formatNumber } from "@/lib/format-price";
import type { Locale } from "@/lib/i18n";
import styles from "./cart-sheet.module.css";

const NAME_KEY: Record<CartService, "cartPharmacy" | "cartLab" | "cartRadiology" | "cartNursing"> = {
  pharmacy: "cartPharmacy", lab: "cartLab", radiology: "cartRadiology", nursing: "cartNursing",
};

export type CartSheetProps = {
  locale: Locale;
  carts: { service: CartService; href: string; count: number }[];
  wrap: RefObject<HTMLElement | null>;
  button: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onId: (id: string) => void;
};

/**
 * The "Your carts" chooser body (portal on phones, focus handling, backdrop / Escape / outside close, the list).
 * Loaded by cart-link.tsx with a dynamic import on the first open only, so it is not in the first-load JS.
 */
export default function CartSheet({ locale, carts, wrap, button, onClose, onId }: CartSheetProps) {
  const shell = useTranslations("CoreShell");
  const menu = useRef<HTMLUListElement>(null);
  const menuId = useId();
  // the sheet is drawn on <body>: a header with a blur or transform would otherwise become the 'fixed' box of the sheet
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [phone, setPhone] = useState(false);
  useEffect(() => { const q = window.matchMedia("(max-width: 767px)"); const on = () => setPhone(q.matches); on(); q.addEventListener("change", on); return () => q.removeEventListener("change", on); }, []);
  useEffect(() => { onId(menuId); }, [menuId, onId]);
  useEffect(() => {
    const away = (event: Event) => { const node = event.target as Node; if (!wrap.current?.contains(node) && !menu.current?.contains(node)) onClose(); };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") { onClose(); button.current?.focus(); } };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    menu.current?.querySelector<HTMLElement>("a")?.focus();
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [wrap, button, onClose]);
  const sheet = (
    <>
      <span className={styles.cartBackdrop} aria-hidden="true" data-testid="cart-backdrop" onClick={() => { onClose(); button.current?.focus(); }} />
      <ul ref={menu} id={menuId} className={styles.cartMenu} aria-label={shell("cartChooser")} data-testid="cart-chooser">
        <li role="presentation" className={styles.cartMenuTitle} aria-hidden="true">{shell("cartChooser")}</li>
        {carts.map((cart) => (
          <li key={cart.service}>
            <Link href={cart.href} className={styles.cartMenuItem} data-cart-service={cart.service} onClick={onClose}>
              <span>{shell(NAME_KEY[cart.service])}</span>
              <span className={styles.cartMenuCount}>{formatNumber(locale, cart.count)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
  return phone && mounted ? createPortal(sheet, document.body) : sheet;
}
