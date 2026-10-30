import { getImageProps } from "next/image";
import { useTranslations } from "next-intl";
import { AddedRegion, AddToCartButton } from "./add-to-cart-button";
import { ProductCardStatic } from "./product-card-static";
import { markByScript } from "@/lib/i18n/localized-field";
import { promoPercent } from "@/lib/discount";
import { formatNumber, formatPrice } from "@/lib/format-price";
import { allowedImageUrl } from "@/lib/image-hosts";
import styles from "./pharmacy.module.css";

/**
 * The card's picture through the image optimizer (256 px WebP/AVIF for the 132 px box) instead of the CDN original, which
 * runs up to 500 KB a product: the catalogue page loaded 2.8 MB of pictures (issue 427, owner decision 45).
 */
function cardImage(src: string | null | undefined): string | undefined {
  const allowed = allowedImageUrl(src);
  if (!allowed) return src || undefined;
  return getImageProps({ src: allowed, alt: "", width: 128, height: 128 }).props.src;
}

/** The product's pictures after the card's own, as the optimizer's renditions, with no repeats. */
function otherImages(item: { thumb?: string; image: string | null; images?: string[] }): string[] | undefined {
  const own = new Set([item.thumb, item.image].filter(Boolean));
  const seen = new Set<string>();
  const more: string[] = [];
  for (const src of item.images ?? []) {
    const rendition = src && !own.has(src) ? cardImage(src) : undefined;
    if (rendition && !seen.has(rendition)) { seen.add(rendition); more.push(rendition); }
  }
  return more.length ? more.slice(0, 4) : undefined;
}

/** One product of a listing, as the page's API sent it (the public catalogue's card fields). */
export type GridProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  oldPrice: number | null;
  image: string | null;
  /** The card's rendition of `image` (productCardImageSrc, made by the server page); `image` itself goes to the cart. */
  thumb?: string;
  /** The other pictures of the product (the card turns through them while it is on screen). */
  images?: string[];
  form: string | null;
  strength: string | null;
  packageSize: string | null;
  rx: boolean;
  /** `online_exclusive` from the answer (decision 11): kept on the cart line so the cart can say "online only". */
  onlineOnly?: boolean;
  /** Shown on the card instead of the percentage, when the page has its own reason (a cheaper alternative). */
  badge?: string;
};

/**
 * The product cards of canvas/PharmacyHub (a grid) and canvas/ProductWeb / ProductFull ("alternatives": a row on
 * phones, five columns on a desktop). A server component (issue 1835): the cards are the design system's ProductCard markup
 * drawn on the server (product-card-static.tsx) and only each add button is client code; it puts the product in the cart of
 * this browser and says so in a live region (the board's "the count bumps").
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

  return (
    <AddedRegion>
      <ul className={layout === "rail" ? styles.rail : styles.grid}>
        {items.map((item, index) => {
          // Decision 10: no discount on a prescription item, whatever old price the answer carries (canShowPromo, via promoPercent).
          const percent = promoPercent(item, item.price, item.oldPrice);
          // No price from the API: the card says so and cannot be added (no "0.00" made up).
          const priced = item.price > 0;
          const money = formatPrice(locale, item.price);
          const addLabel = t("addToCart", { name: item.name });
          return (
            <li key={item.id} className={styles.cell}>
              <ProductCardStatic
                name={item.name}
                nameMark={markByScript(locale, item.name)}
                meta={[item.form, item.strength, item.packageSize].filter(Boolean).join(" · ") || undefined}
                price={priced ? money.amount : t("priceUnavailable")}
                currency={priced ? money.currency : undefined}
                imageSrc={cardImage(item.thumb || item.image)}
                moreImages={otherImages(item)}
                discountLabel={(item.rx ? undefined : item.badge) || (percent > 0 ? product("discount", { percent: formatNumber(locale, percent) }) : undefined)}
                rxLabel={item.rx ? product("rxRequired") : undefined}
                onlineLabel={item.onlineOnly === true ? product("onlineOnly") : undefined}
                href={`/${locale}/p/${encodeURIComponent(item.slug)}`}
                imagePriority={index < priorityCount}
                add={
                  <AddToCartButton
                    disabled={!priced}
                    addLabel={addLabel}
                    // decision 10: an Rx item in the cart needs a prescription at checkout; the grid says so as the product page does
                    announce={item.rx ? `${t("addedToCart", { name: item.name })} ${t("addedRxNote")}` : t("addedToCart", { name: item.name })}
                    line={{
                      id: item.id,
                      name: item.name,
                      rx: item.rx,
                      onlineOnly: item.onlineOnly === true ? true : undefined,
                      image: item.image,
                      slug: item.slug,
                      form: item.form,
                      strength: item.strength,
                    }}
                  />
                }
              />
            </li>
          );
        })}
      </ul>
    </AddedRegion>
  );
}
