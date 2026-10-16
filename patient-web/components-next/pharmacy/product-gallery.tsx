"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { CatalogImage } from "./catalog-image";
import { arrowStep, clamp, isRtl, slideIndex, slideOffset } from "./gallery-math";
import { ImageViewer } from "./image-viewer";
import { PHARMACY_TONE } from "./tones";
import { WishlistHeart } from "./wishlist-heart";
import styles from "./product-detail.module.css";

/**
 * The product gallery (canvas/ProductWeb: a column of 76 px thumbnails beside the stage; canvas/ProductFull: the
 * stage with dots under it). One list of buttons draws both: dots on phones, thumbnails from 768. With no picture there
 * is the category's own icon on its tinted tile, never a stock photo (spec A, "Gallery").
 *
 * Issue 1547: the stage is a scroll-snap strip, so a swipe moves between the pictures before and after the page
 * hydrates (mirrored right to left by the strip's direction); the arrow keys move too, and a "2 / 4" counter says where
 * the visitor is. Each picture is a plain link to the full picture, so a tap before hydration still opens it; once the
 * page is interactive the tap opens the full-screen viewer (image-viewer.tsx) instead.
 */
export function ProductGallery({ name, images, badge, itemId, locale }: { name: string; images: string[]; badge?: string; itemId?: string; locale: string }) {
  const t = useTranslations("PharmacyBrowse");
  const [index, setIndex] = useState(0);
  const shown = useRef(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const track = useRef<HTMLUListElement>(null);
  const total = images.length;

  const go = useCallback((target: number, smooth = true) => {
    const el = track.current;
    if (!el || total === 0) return;
    const i = clamp(target, 0, total - 1);
    el.scrollTo({ left: slideOffset(i, el.clientWidth, isRtl(el)), behavior: smooth ? "smooth" : "auto" });
    shown.current = i;
    setIndex(i);
  }, [total]);

  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>
        {total > 0 ? (
          <>
            <ul
              ref={track}
              className={styles.stageTrack}
              data-testid="gallery-stage"
              aria-label={t("imageOf", { n: index + 1, total })}
              tabIndex={total > 1 ? 0 : undefined}
              onScroll={(event) => {
                const el = event.currentTarget;
                const i = slideIndex(el.scrollLeft, el.clientWidth, total);
                if (i !== shown.current) {
                  shown.current = i;
                  setIndex(i);
                }
              }}
              onKeyDown={(event) => {
                const step = arrowStep(event.key, isRtl(event.currentTarget));
                if (step !== 0 && total > 1) {
                  event.preventDefault();
                  go(shown.current + step);
                }
              }}
            >
              {images.map((src, i) => (
                <li key={src} className={styles.slide}>
                  <a
                    href={src}
                    className={styles.stageButton}
                    aria-label={t("zoomImage")}
                    onClick={(event) => {
                      event.preventDefault();
                      setViewer(i);
                    }}
                  >
                    <CatalogImage
                      src={src}
                      alt={`${name} (${t("imageOf", { n: i + 1, total })})`}
                      priority={i === 0}
                      sizes="(min-width: 1024px) 480px, 100vw"
                      className={styles.stageImage}
                    />
                  </a>
                </li>
              ))}
            </ul>
            {total > 1 ? <span className={styles.counter} data-testid="gallery-counter">{t("imageCounter", { n: index + 1, total })}</span> : null}
            <ImageViewer
              name={name}
              images={images}
              open={viewer !== null}
              start={viewer ?? index}
              onClose={(last) => {
                setViewer(null);
                go(last, false);
              }}
            />
          </>
        ) : (
          <div className={styles.noImage}>
            <FIcon icon="pill" tone={PHARMACY_TONE} size={112} />
          </div>
        )}
        {badge ? <span className={styles.stageBadge}>{badge}</span> : null}
        {itemId ? <WishlistHeart itemId={itemId} locale={locale} /> : null}
      </div>
      {total > 1 ? (
        <ul className={styles.thumbs} aria-label={t("imageOf", { n: index + 1, total })}>
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                className={`${styles.thumb} ${i === index ? styles.thumbOn : ""}`}
                aria-label={t("showImage", { n: i + 1 })}
                aria-current={i === index ? "true" : undefined}
                onClick={() => go(i)}
              >
                <CatalogImage src={src} alt="" width={76} height={76} className={styles.thumbImage} sizes="76px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
