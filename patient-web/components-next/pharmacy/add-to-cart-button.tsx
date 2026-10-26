"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { FILL_ICON_VIEWBOX } from "@/components-next/ui-generated/icons/fill";
import { PLUS_SQUARE_PATH } from "@/components-next/ui-generated/icons/marks";
import { useCart } from "@/lib/context/CartContext";
import { formatNumber } from "@/lib/format-price";
import motion from "./cart-stepper.module.css";
import styles from "./pharmacy.module.css";

/** How long the "removed, undo" toast stays (ms). */
const TOAST_MS = 5000;

type Toast = { text: string; undoLabel: string; onUndo: () => void } | null;

/**
 * The client part of a product grid: the add button of each card, the one live region that says what was added (the board's
 * "the count bumps") and the "removed - undo" toast. Everything else in the grid is server markup (product-card-static.tsx).
 */
const AnnounceContext = createContext<(message: string) => void>(() => {});
const ToastContext = createContext<(toast: Exclude<Toast, null>) => void>(() => {});

export function AddedRegion({ children }: { children: ReactNode }) {
  const [added, setAdded] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((next: Exclude<Toast, null>) => {
    window.clearTimeout(timer.current);
    setToast(next);
    timer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <AnnounceContext.Provider value={setAdded}>
      <ToastContext.Provider value={show}>
        {children}
        <p role="status" className={styles.srOnly}>{added}</p>
        {toast ? (
          <div role="status" className={motion.toast} data-testid="cart-toast">
            <span>{toast.text}</span>
            <button type="button" className={motion.toastUndo} onClick={() => { toast.onUndo(); window.clearTimeout(timer.current); setToast(null); }}>{toast.undoLabel}</button>
          </div>
        ) : null}
      </ToastContext.Provider>
    </AnnounceContext.Provider>
  );
}

export type CartLine = {
  id: string;
  name: string;
  rx: boolean;
  onlineOnly?: boolean;
  image: string | null;
  slug: string;
  form: string | null;
  strength: string | null;
};

const MINUS_PATH = "M5 12h14";
const PLUS_PATH = "M5 12h14M12 5v14";

/**
 * The add button of a product card. Nothing in the cart yet: the board's + square. After the first add it becomes a stepper
 * [- qty +] whose quantity is the cart store's own (so the same product shows the same number on every card and page, and after
 * a reload); - at 1 removes the line and offers "undo". The first add flies the product's picture to the header cart icon
 * (lib/motion/fly-to-cart.ts, loaded only then; not at all with reduced motion).
 */
export function AddToCartButton({ line, addLabel, announce, disabled = false }: {
  line: CartLine;
  addLabel: string;
  /** The live-region text after adding (already translated, with the prescription note for an Rx item). */
  announce: string;
  disabled?: boolean;
}) {
  const { items, addItem, removeItem, updateQty } = useCart();
  const say = useContext(AnnounceContext);
  const showToast = useContext(ToastContext);
  const t = useTranslations("PharmacyBrowse");
  const locale = useLocale();
  const qty = items.find((item) => item.id === line.id)?.qty ?? 0;

  const fly = (from: HTMLElement) => { void import("@/lib/motion/fly-to-cart").then((m) => m.flyToCart(from)); };

  if (qty > 0 && !disabled) {
    return (
      <span className={motion.stepper} role="group" aria-label={t("qtyInCart", { n: qty })} data-testid="cart-stepper">
        <button
          type="button"
          className={motion.stepButton}
          aria-label={t("stepperDecrease", { name: line.name })}
          onClick={() => {
            if (qty > 1) { updateQty(line.id, -1); return; }
            removeItem(line.id);
            showToast({ text: t("removedFromCart", { name: line.name }), undoLabel: t("undo"), onUndo: () => addItem({ ...line, qty: 1 }) });
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true"><path d={MINUS_PATH} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" /></svg>
          <span aria-hidden className="nabd-product-card__hit" />
        </button>
        <span className={motion.qty} aria-live="polite" data-testid="cart-stepper-qty">{formatNumber(locale, qty)}</span>
        <button
          type="button"
          className={motion.stepButton}
          aria-label={t("stepperIncrease", { name: line.name })}
          onClick={(event) => { updateQty(line.id, 1); fly(event.currentTarget); }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true"><path d={PLUS_PATH} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" /></svg>
          <span aria-hidden className="nabd-product-card__hit" />
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={addLabel}
      disabled={disabled}
      onClick={disabled ? undefined : (event) => { addItem({ ...line, qty: 1 }); say(announce); fly(event.currentTarget); }}
      className={clsx("nabd-product-card__add", { "nabd-product-card__add--inert": disabled, "nabd-product-card__add--disabled": disabled })}
    >
      <svg width={18} height={18} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true">
        <path d={PLUS_SQUARE_PATH} fill="var(--nabd-color-action-selected-fg)" />
      </svg>
      {/* 40 to look at, 44 to hit */}
      <span aria-hidden className="nabd-product-card__hit" />
    </button>
  );
}
