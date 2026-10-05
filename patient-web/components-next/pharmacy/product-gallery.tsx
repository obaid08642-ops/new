"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { IconButton } from "@/components-next/ui-generated/components/Button";
import { CatalogImage } from "./catalog-image";
import { PHARMACY_TONE } from "./tones";
import styles from "./product-detail.module.css";

/**
 * The product gallery (canvas/ProductWeb: a column of 76 px thumbnails beside the stage; canvas/ProductFull: the
 * stage with dots under it). One list of buttons draws both: dots on phones, thumbnails from 768. The stage opens
 * the picture in a dialog (the page's existing zoom). With no picture there is the category's own icon on its
 * tinted tile, never a stock photo (spec A, "Gallery").
 */
export function ProductGallery({ name, images, badge }: { name: string; images: string[]; badge?: string }) {
  const t = useTranslations("PharmacyBrowse");
  const [index, setIndex] = useState(0);
  const zoom = useRef<HTMLDialogElement>(null);
  const current = images[index] ?? images[0];

  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>
        {current ? (
          <>
            <button type="button" className={styles.stageButton} aria-label={t("zoomImage")} onClick={() => zoom.current?.showModal()}>
              <CatalogImage
                src={current}
                alt={`${name} (${t("imageOf", { n: index + 1, total: images.length })})`}
                priority
                sizes="(min-width: 1024px) 480px, 100vw"
                className={styles.stageImage}
              />
            </button>
            <dialog ref={zoom} className={styles.zoom} aria-label={name} onClick={(event) => { if (event.target === zoom.current) zoom.current?.close(); }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the dialog shows the picture at its own size, once, on request */}
              <img src={current} alt={name} className={styles.zoomImage} />
              <div className={styles.zoomClose}>
                <IconButton name="close" label={t("closeImage")} variant="outlined" onClick={() => zoom.current?.close()} />
              </div>
            </dialog>
          </>
        ) : (
          <div className={styles.noImage}>
            <FIcon icon="pill" tone={PHARMACY_TONE} size={112} />
          </div>
        )}
        {badge ? <span className={styles.stageBadge}>{badge}</span> : null}
      </div>
      {images.length > 1 ? (
        <ul className={styles.thumbs} aria-label={t("imageOf", { n: index + 1, total: images.length })}>
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                className={`${styles.thumb} ${i === index ? styles.thumbOn : ""}`}
                aria-label={t("showImage", { n: i + 1 })}
                aria-current={i === index ? "true" : undefined}
                onClick={() => setIndex(i)}
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
