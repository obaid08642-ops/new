import type { ReactNode } from "react";
import { CardImageRotator } from "./card-image-rotator";
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX } from "@/components-next/ui-generated/icons/fill";

/**
 * The design system's ProductCard (ui-generated/components/Cards.tsx) drawn on the server: the same markup and classes, with
 * no client code. The generated card is a "use client" component, so 24 of them on /ar/c each ran their render on hydration
 * (issue 1835, TBT); here only the add button is a client island (`add`), and the link is a plain anchor. A test pins the markup
 * to the generated card's, so the two cannot drift.
 */
export type ProductCardStaticProps = {
  name: string;
  /** Set when the name is not in the page's script (lang/dir on the name only; markup is unchanged otherwise). */
  nameMark?: { lang: string; dir: "rtl" | "ltr" };
  meta?: string;
  price: string;
  currency?: string;
  imageSrc?: string;
  /** The card's other pictures: with at least one, the card turns through them while it is on screen (card-image-rotator.tsx). */
  moreImages?: string[];
  discountLabel?: string;
  rxLabel?: string;
  onlineLabel?: string;
  href: string;
  imagePriority?: boolean;
  disabled?: boolean;
  /** The add button (a client island), or an inert one for a product with no price. */
  add: ReactNode;
};

export function ProductCardStatic({ name, nameMark, meta, price, currency, imageSrc, moreImages, discountLabel, rxLabel, onlineLabel, href, imagePriority = false, add }: ProductCardStaticProps) {
  return (
    <div className="nabd-product-card">
      <a href={href} className="nabd-product-card__link">
        <div className={`nabd-product-card__media${imageSrc ? " nabd-product-card__media--photo" : ""}`}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              aria-hidden
              className="nabd-product-card__img"
              loading={imagePriority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={imagePriority ? "high" : "auto"}
            />
          ) : (
            <svg width={40} height={40} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true" className="nabd-cards-glyph">
              <path d={FILL_ICON_PATHS.pill} fill="var(--nabd-color-icon-secondary)" />
            </svg>
          )}
          {imageSrc && moreImages && moreImages.length > 0 ? <CardImageRotator srcs={[imageSrc, ...moreImages]} /> : null}
          {discountLabel ? <span className="nabd-product-card__discount">{discountLabel}</span> : null}
        </div>
        <span className="nabd-product-card__name" {...(nameMark ? { lang: nameMark.lang, dir: nameMark.dir } : {})}>{name}</span>
        {meta ? <span className="nabd-product-card__meta">{meta}</span> : null}
      </a>
      <div className="nabd-product-card__bar">
        <div className="nabd-product-card__prices">
          <span className="nabd-product-card__price">
            {price}
            {currency ? <span className="nabd-product-card__currency"> {currency}</span> : null}
          </span>
          {rxLabel ? <span className="nabd-product-card__rx">{rxLabel}</span> : null}
          {onlineLabel ? <span className="nabd-product-card__online">{onlineLabel}</span> : null}
        </div>
        {add}
      </div>
    </div>
  );
}

