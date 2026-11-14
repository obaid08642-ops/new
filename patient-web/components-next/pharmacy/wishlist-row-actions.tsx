"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, IconButton } from "@/components-next/ui-generated/components/Button";
import { useCart } from "@/lib/context/CartContext";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import { requestWishlistToggle } from "@/lib/pharmacy/wishlist-toggle";
import styles from "./pharmacy.module.css";

/**
 * The two actions on a wishlist row (parity audit /wishlist, as in the app): take it off the list, or put it in the cart.
 * Remove is the same request as the heart on the product page; the list is then refreshed. Add-to-cart puts the line in the
 * cart with the wishlist's flags; the price comes with the pharmacies' offers, as everywhere else.
 */
export function WishlistRowActions({ locale, itemId, name, rx, onlineOnly }: { locale: string; itemId: string; name: string; rx: boolean; onlineOnly: boolean }) {
  const t = useTranslations("PharmacyBrowse");
  const router = useRouter();
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const running = useRef(false);

  async function remove() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    // The row is on the list, so the request takes it off (was = true).
    const result = await requestWishlistToggle(itemId, true, newIdempotencyKey());
    running.current = false;
    setBusy(false);
    if (result.state === "signed_out") return router.push(`/${locale}/login`);
    router.refresh();
  }

  function addToCart() {
    addItem({ id: itemId, name, rx, onlineOnly: onlineOnly ? true : undefined, qty: 1 });
    setAdded(true);
  }

  return (
    <div className={styles.rowActions}>
      <IconButton name="heart" label={t("wishlistRemove")} variant="filled" loading={busy} onClick={remove} />
      <Button size="sm" variant={added ? "primary" : "outline"} label={t("addToCart", { name })} onClick={addToCart} />
    </div>
  );
}
