"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ProductCard } from "@/components-next/ui-generated/components/Cards";
import { useCart } from "@/lib/context/CartContext";
import { promoPercent } from "@/lib/discount";
import { formatNumber, formatPrice } from "@/lib/format-price";
import styles from "./pharmacy.module.css";

/** One product of a listing, as the page's API sent it (the public catalogue's card fields). */
export type GridProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  oldPrice: number | null;
  image: string | null;
  form: string | null;
  strength: string | null;
  packageSize: string | null;
  rx: boolean;
  /** Shown on the card instead of the percentage, when the page has its own reason (a cheaper alternative). */
  badge?: string;
};

/**
 * The product cards of canvas/PharmacyHub (a grid) and canvas/ProductWeb / ProductFull ("alternatives": a row on
 * phones, five columns on a desktop). The card is the design system's `ProductCard`; the add button puts the product
 * in the cart of this browser and says so in a live region (the board's "the count bumps").
 */
export function ProductGrid({
  locale,
  items,
  layout = "grid",
  priorityCount = 0,
}: {
  locale: string;
  items: GridProduct[];
  layout?: "grid" | "rail";
  /** How many of the first cards load their image early (the first row is the page's largest paint). */
  priorityCount?: number;
}) {
  const t = useTranslations("PharmacyBrowse");
  const product = useTranslations("PublicProduct");
  const { addItem } = useCart();
  const [added, setAdded] = useState("");

  return (
    <>
      <ul className={layout === "rail" ? styles.rail : styles.grid}>
        {items.map((item, index) => {
          // Decision 10: no discount on a prescription item, whatever old price the answer carries (canShowPromo, via promoPercent).
          const percent = promoPercent(item, item.price, item.oldPrice);
          // No price from the API: the card says so and cannot be added (no "0.00" made up).
          const priced = item.price > 0;
          const money = formatPrice(locale, item.price);
          return (
            <li key={item.id} className={styles.cell}>
              <ProductCard
                name={item.name}
                meta={[item.form, item.strength, item.packageSize].filter(Boolean).join(" · ") || undefined}
                price={priced ? money.amount : t("priceUnavailable")}
                currency={priced ? money.currency : undefined}
                disabled={!priced}
                imageSrc={item.image || undefined}
                discountLabel={(item.rx ? undefined : item.badge) || (percent > 0 ? product("discount", { percent: formatNumber(locale, percent) }) : undefined)}
                rxLabel={item.rx ? product("rxRequired") : undefined}
                addLabel={t("addToCart", { name: item.name })}
                href={`/${locale}/p/${encodeURIComponent(item.slug)}`}
                linkAs={Link}
                imagePriority={index < priorityCount}
                onAdd={() => {
                  addItem({
                    id: item.id,
                    name: item.name,
                    rx: item.rx,
                    image: item.image,
                    slug: item.slug,
                    form: item.form,
                    strength: item.strength,
                    qty: 1,
                  });
                  setAdded(t("addedToCart", { name: item.name }));
                }}
              />
            </li>
          );
        })}
      </ul>
      <p role="status" className={styles.srOnly}>{added}</p>
    </>
  );
}
