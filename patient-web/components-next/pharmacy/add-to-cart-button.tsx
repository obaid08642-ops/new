"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import clsx from "clsx";
import { FILL_ICON_VIEWBOX } from "@/components-next/ui-generated/icons/fill";
import { PLUS_SQUARE_PATH } from "@/components-next/ui-generated/icons/marks";
import { useCart } from "@/lib/context/CartContext";
import styles from "./pharmacy.module.css";

/**
 * The client part of a product grid: the add button of each card and the one live region that says what was added
 * (the board's "the count bumps"). Everything else in the grid is server markup (product-card-static.tsx).
 */
const AnnounceContext = createContext<(message: string) => void>(() => {});

export function AddedRegion({ children }: { children: ReactNode }) {
  const [added, setAdded] = useState("");
  return (
    <AnnounceContext.Provider value={setAdded}>
      {children}
      <p role="status" className={styles.srOnly}>{added}</p>
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

export function AddToCartButton({ line, addLabel, announce, disabled = false }: {
  line: CartLine;
  addLabel: string;
  /** The live-region text after adding (already translated, with the prescription note for an Rx item). */
  announce: string;
  disabled?: boolean;
}) {
  const { addItem } = useCart();
  const say = useContext(AnnounceContext);
  return (
    <button
      type="button"
      aria-label={addLabel}
      disabled={disabled}
      onClick={disabled ? undefined : () => { addItem({ ...line, qty: 1 }); say(announce); }}
      className={clsx("nabd-product-card__add", { "nabd-product-card__add--inert": disabled, "nabd-product-card__add--disabled": disabled })}
    >
      <svg width={18} height={18} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true">
        <path d={PLUS_SQUARE_PATH} fill="var(--nabd-color-action-primary-fg)" />
      </svg>
      {/* 40 to look at, 44 to hit */}
      <span aria-hidden className="nabd-product-card__hit" />
    </button>
  );
}
