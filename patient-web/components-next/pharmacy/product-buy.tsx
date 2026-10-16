"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  /** `online_exclusive`, when the source of the product knows it (the public product answer sends it since the fix session). */
  onlineOnly?: boolean;
};

/** Decision D (issue 1556): one variant of the product on the page (its own record: id, SKU, price, picture). */
export type BuyVariant = {
  id: string;
  sku: number | null;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  available: boolean;
  /** What the picker draws: the power, and the colour/shade word of the English name, or nothing (picture only). */
  power: number | null;
  colour: string | null;
  shade: string | null;
  kind: string;
};

type Buy = {
  /** The product the buy controls act on: the chosen variant when the product has variants, else the page's product. */
  product: BuyProduct;
  variants: BuyVariant[];
  selectedId: string;
  selectVariant: (id: string) => void;
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
export function BuyProvider({ locale, product: pageProduct, variants = [], children }: { locale: string; product: BuyProduct; variants?: BuyVariant[]; children: ReactNode }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedId, setSelectedId] = useState(pageProduct.id);

  // Decision D: the URL keeps the chosen variant (?v=<id>, shareable). Read once on load; the page itself is the same
  // cached HTML for everyone (ISR), so the choice lives in the address bar and this state, never in the server render.
  useEffect(() => {
    if (!variants.length || typeof window === "undefined") return;
    const v = new URLSearchParams(window.location.search).get("v");
    const hit = v ? variants.find((x) => x.id === v) : undefined;
    if (hit && hit.available) setSelectedId(hit.id);
  }, [variants]);

  const selectVariant = useCallback((id: string) => {
    const hit = variants.find((x) => x.id === id);
    if (!hit || !hit.available) return;
    setSelectedId(id);
    setAdded(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("v", id);
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }, [variants]);

  const chosen = variants.find((x) => x.id === selectedId);
  // the variant is its own record: the cart line is that record (its id is the SKU the order sends), with its name and picture
  const product = useMemo<BuyProduct>(() => (chosen
    ? { ...pageProduct, id: chosen.id, name: chosen.name || pageProduct.name, price: chosen.price, image: chosen.image || pageProduct.image, slug: chosen.slug || pageProduct.slug }
    : pageProduct), [chosen, pageProduct]);

  // the cart keeps what to order, never the catalogue price (the pharmacies' offers carry the prices)
  const putInCart = useCallback(() => {
    const { id, name, rx, image, slug, activeIngredient, form, strength, onlineOnly } = product;
    addItem({ id, name, rx, image, slug, activeIngredient, form, strength, onlineOnly: onlineOnly === true ? true : undefined, qty });
  }, [addItem, product, qty]);

  const addToCart = useCallback(() => {
    putInCart();
    setAdded(true);
  }, [putInCart]);

  const buyNow = useCallback(() => {
    putInCart();
    router.push(`/${locale}/cart`);
  }, [putInCart, router, locale]);

  const value = useMemo(
    () => ({ product, variants, selectedId, selectVariant, qty, setQty: (n: number) => { setQty(n); setAdded(false); }, added, addToCart, buyNow }),
    [product, variants, selectedId, selectVariant, qty, added, addToCart, buyNow],
  );
  return <BuyContext.Provider value={value}>{children}</BuyContext.Provider>;
}

export function useBuy() {
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
  const { product, qty, addToCart, buyNow } = useBuy();
  return (
    <div className={styles.bar}>
      <div className={styles.barTotal}>
        <span className={styles.barLabel}>{t("referencePrice")}</span>
        <span className={styles.barAmount}>
          {formatPrice(locale, product.price * qty).text}
        </span>
      </div>
      <Button label={t("addToCartCta")} variant="outline" size="md" onClick={addToCart} />
      <Button label={t("buyNow")} variant="primary" size="md" onClick={buyNow} />
    </div>
  );
}

/** Decision D: the reference price of the chosen variant (the buy card's price row, drawn on the client when the product has variants). */
export function BuyPrice({ locale, className, amountClassName, currencyClassName }: { locale: string; className: string; amountClassName: string; currencyClassName: string }) {
  const { product } = useBuy();
  const money = formatPrice(locale, product.price);
  return (
    <div className={className} aria-live="polite" data-testid="variant-price">
      <strong className={amountClassName}>{money.amount}</strong>
      <span className={currencyClassName}>{money.currency}</span>
    </div>
  );
}
