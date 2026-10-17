"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Stepper } from "@/components-next/ui-generated/components/Inputs";
import { useCart } from "@/lib/context/CartContext";
import { ButtonLink } from "./button-link";
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
  /** `online_exclusive`, when the source of the product knows it (the public product answer sends it since the fix session). */
  onlineOnly?: boolean;
};

type Buy = {
  product: BuyProduct;
  /** The quantity shown: the cart line's once the product is in the cart, the one picked before that. */
  qty: number;
  setQty: (n: number) => void;
  /** How many of this product the cart of this browser holds (0: not in the cart). */
  inCart: number;
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
  const { addItem, items, updateQty } = useCart();
  const [picked, setPicked] = useState(1);
  const [added, setAdded] = useState(false);
  // Issue 1547 (as the app's product screen): once the product is in the cart the stepper edits the cart line, the add
  // button becomes "in cart (n)" with the way to the cart, and "buy now" does not add it a second time.
  const inCart = items.find((line) => line.id === product.id)?.qty ?? 0;
  const qty = inCart > 0 ? inCart : picked;

  // the cart keeps what to order, never the catalogue price (the pharmacies' offers carry the prices)
  const putInCart = useCallback(() => {
    const { id, name, rx, image, slug, activeIngredient, form, strength, onlineOnly } = product;
    addItem({ id, name, rx, image, slug, activeIngredient, form, strength, onlineOnly: onlineOnly === true ? true : undefined, qty });
  }, [addItem, product, qty]);

  const addToCart = useCallback(() => {
    if (inCart > 0) return;
    putInCart();
    setAdded(true);
  }, [putInCart, inCart]);

  const buyNow = useCallback(() => {
    if (inCart === 0) putInCart();
    router.push(`/${locale}/cart`);
  }, [putInCart, inCart, router, locale]);

  const setQty = useCallback((n: number) => {
    if (inCart > 0) updateQty(product.id, n - inCart);
    else setPicked(n);
  }, [inCart, updateQty, product.id]);

  const value = useMemo(() => ({ product, qty, setQty, inCart, added, addToCart, buyNow }), [product, qty, setQty, inCart, added, addToCart, buyNow]);
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
  const { product, qty, setQty, inCart, added, addToCart, buyNow } = useBuy();
  return (
    <div className={styles.buy}>
      <div className={styles.buyRow}>
        <Stepper
          value={qty}
          onChange={setQty}
          min={1}
          max={Math.max(MAX_QTY, qty)}
          label={t("quantity")}
          format={(n) => formatNumber(locale, n)}
          decrementLabel={t("decreaseQty")}
          incrementLabel={t("increaseQty")}
        />
        <div className={styles.buyButtons}>
          {inCart > 0 ? (
            <ButtonLink href={`/${locale}/cart`} label={t("inCartCta", { n: inCart })} variant="outline" size="lg" fullWidth />
          ) : (
            <Button label={t("addToCartCta")} variant="outline" size="lg" fullWidth onClick={addToCart} />
          )}
          <Button label={t("buyNow")} variant="primary" size="lg" fullWidth onClick={buyNow} />
        </div>
      </div>
      <p role="status" className={styles.added}>
        {added ? (
          <>
            {t("addedToCart", { name: product.name })}{" "}
            <Link href={`/${locale}/cart`} className={styles.addedLink}>{t("viewCart")}</Link>
            {product.rx ? <span className={styles.addedRx}>{t("addedRxNote")}</span> : null}
          </>
        ) : null}
      </p>
    </div>
  );
}

/** The sticky bar below 1024 (canvas/ProductFull): the total, "add to cart", "buy now". The card shows them from 1024. */
export function BuyBar({ locale }: { locale: string }) {
  const t = useTranslations("PharmacyBrowse");
  const { product, qty, inCart, addToCart, buyNow } = useBuy();
  return (
    <div className={styles.bar}>
      <div className={styles.barTotal}>
        <span className={styles.barLabel}>{t("referencePrice")}</span>
        <span className={styles.barAmount}>
          {formatPrice(locale, product.price * qty).text}
        </span>
      </div>
      {inCart > 0 ? (
        <ButtonLink href={`/${locale}/cart`} label={t("inCartCta", { n: inCart })} variant="outline" size="md" />
      ) : (
        <Button label={t("addToCartCta")} variant="outline" size="md" onClick={addToCart} />
      )}
      <Button label={t("buyNow")} variant="primary" size="md" onClick={buyNow} />
    </div>
  );
}
