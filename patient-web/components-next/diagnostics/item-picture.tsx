import type { ReactNode } from "react";
import { allowedImageUrl } from "@/lib/image-hosts";
import { PhotoWithFallback } from "./photo-with-fallback";
import styles from "./diag.module.css";

/**
 * The picture of a test or scan: its OWN image (`image_url` of the lab / radiology service, the same field the carousel and the
 * catalogue send) first; `fallback` (the category illustration or the service tile) only when the item has none, the address is
 * not on an allowed host, or the file fails to load. One rule for the hub cards and the item page.
 */
export function resolveItemImage(imageUrl: string | null | undefined): { kind: "own"; src: string } | { kind: "fallback" } {
  const src = allowedImageUrl(imageUrl);
  return src ? { kind: "own", src } : { kind: "fallback" };
}

export function ItemPicture({ imageUrl, fallback }: { imageUrl?: string | null; fallback: ReactNode }) {
  const pick = resolveItemImage(imageUrl);
  if (pick.kind === "fallback") return <>{fallback}</>;
  return <PhotoWithFallback src={pick.src} sizes="56px" wrapClassName={styles.itemPhoto} className={styles.photoImage} fallback={fallback} />;
}
