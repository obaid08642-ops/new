"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Stepper } from "@/components-next/ui-generated/components/Inputs";
import { useCart } from "@/lib/context/CartContext";
import { formatNumber, formatPrice } from "@/lib/format-price";
import styles from "./product-detail.module.css";

/** What the cart needs to know about the product on the page. */
export type BuyProduct = {
  id: string;
  name: string;
  price: number;
  rx: boolean;
  image: string | null;
  slug: string;
  activeIngredient: string | null;
  form: string | null;
  strength: string | null;
};

type Buy = {
  product: BuyProduct;
  qty: number;
  setQty: (n: number) => void;
  added: boolean;
  addToCart: () => void;
  buyNow: () => void;
};

const BuyContext = createContext<Buy | null>(null);
const MAX_QTY = 10;

/**
 * The quantity and the two ways to order are shared by the buy card (a desktop and a phone) and the phone's sticky
 * bar (canvas/ProductFull), which are drawn in different places of the page, so they read one state from here.
 */
export function BuyProvider({ locale, product, children }: { locale: string; product: BuyProduct; children: ReactNode }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // the cart keeps what to order, never the catalogue price (the pharmacies' offers carry the prices)
  const putInCart = useCallback(() => {
    const { id, name, rx, image, slug, activeIngredient, form, strength } = product;
    addItem({ id, name, rx, image, slug, activeIngredient, form, strength, qty });
  }, [addItem, product, qty]);

  const addToCart = useCallback(() => {
    putInCart();
    setAdded(true);
  }, [putInCart]);

  const buyNow = useCallback(() => {
    putInCart();
    router.push(`/${locale}/cart`);
  }, [putInCart, router, locale]);

  const value = useMemo(() => ({ product, qty, setQty: (n: number) => { setQty(n); setAdded(false); }, added, addToCart, buyNow }), [product, qty, added, addToCart, buyNow]);
  return <BuyContext.Provider value={value}>{children}</BuyContext.Provider>;
}

function useBuy() {
  const ctx = useContext(BuyContext);
  if (!ctx) throw new Error("useBuy: render inside <BuyProvider>");
  return ctx;
}

/** The buy card's controls (canvas/ProductWeb): the stepper, "add to cart" (outline) and "buy now" (primary). */
export function BuyActions({ locale }: { locale: string }) {
  const t = useTranslations("PharmacyBrowse");
  const { product, qty, setQty, added, addToCart, buyNow } = useBuy();
  return (
    <div className={styles.buy}>
      <div className={styles.buyRow}>
        <Stepper
          value={qty}
          onChange={setQty}
          min={1}
          max={MAX_QTY}
          label={t("quantity")}
          format={(n) => formatNumber(locale, n)}
          decrementLabel={t("decreaseQty")}
          incrementLabel={t("increaseQty")}
        />
        <div className={styles.buyButtons}>
          <Button label={t("addToCartCta")} variant="outline" size="lg" fullWidth onClick={addToCart} />
          <Button label={t("buyNow")} variant="primary" size="lg" fullWidth onClick={buyNow} />
        </div>
      </div>
      <p role="status" className={styles.added}>
        {added ? (
          <>
            {t("addedToCart", { name: product.name })}{" "}
            <Link href={`/${locale}/cart`} className={styles.addedLink}>{t("viewCart")}</Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

/** The sticky bar below 1024 (canvas/ProductFull): the total, "add to cart", "buy now". The card shows them from 1024. */
export function BuyBar({ locale }: { locale: string }) {
  const t = useTranslations("PharmacyBrowse");
  const { product, qty, addToCart, buyNow } = useBuy();
  return (
    <div className={styles.bar}>
      <div className={styles.barTotal}>
        <span className={styles.barLabel}>{t("total")}</span>
        <span className={styles.barAmount}>
          {formatPrice(locale, product.price * qty).text}
        </span>
      </div>
      <Button label={t("addToCartCta")} variant="outline" size="md" onClick={addToCart} />
      <Button label={t("buyNow")} variant="primary" size="md" onClick={buyNow} />
    </div>
  );
}
