"use client";

import { useEffect, useRef, useState } from "react";
import { MOTION, reducedMotion } from "@/lib/motion/motion";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components-next/ui-generated/components/Button";
import { extractWishlist } from "@/lib/api/wishlist";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import { requestWishlistToggle } from "@/lib/pharmacy/wishlist-toggle";
import styles from "./product-detail.module.css";

/**
 * The heart of canvas/ProductWeb and ProductFull: puts this medicine on the patient's wishlist or takes it off
 * (`POST /users/me/wishlist/:itemId` toggles it; the state is read from `GET /users/me/wishlist`). The label says what a
 * press does, so it carries the state. A visitor who is not signed in is sent to sign in; a failed request keeps the
 * state it had and says so.
 */
export function WishlistHeart({ itemId, locale }: { itemId: string; locale: string }) {
  const t = useTranslations("PharmacyBrowse");
  const router = useRouter();
  const [inList, setInList] = useState(false);
  const [signedIn, setSignedIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const running = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const wasIn = useRef(false);
  // the heart pops (scale 1 -> 1.25 -> 1) when it turns on; not with reduced motion
  useEffect(() => {
    if (inList && !wasIn.current && !reducedMotion()) {
      box.current?.querySelector("button")?.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)", offset: 0.5 }, { transform: "scale(1)" }], { duration: MOTION.pop, easing: MOTION.ease });
    }
    wasIn.current = inList;
  }, [inList]);

  useEffect(() => {
    let active = true;
    fetch("/api/patient/users/me/wishlist", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) return setSignedIn(false);
        if (!response.ok) return;
        const list = extractWishlist(await response.json().catch(() => null));
        if (active) setInList(list.some((entry) => entry.id === itemId));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [itemId]);

  async function toggle() {
    if (!signedIn) return router.push(`/${locale}/login`);
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setFailed(false);
    // 15.3: optimistic (a wishlist is safe to show at once): the heart changes now and goes back, with the message, when the
    // server refuses or cannot be reached
    const was = inList;
    setInList(!was);
    const result = await requestWishlistToggle(itemId, was, newIdempotencyKey());
    if (result.state === "ok") setInList(result.inList);
    else {
      setInList(was);
      if (result.state === "signed_out") setSignedIn(false);
      else setFailed(true);
    }
    running.current = false;
    setBusy(false);
  }

  return (
    <div className={styles.wishlist} ref={box}>
      <IconButton name="heart" label={inList ? t("wishlistRemove") : t("wishlistAdd")} variant={inList ? "filled" : "outlined"} loading={busy} onClick={toggle} />
      {failed ? <p role="status" className={styles.wishlistError}>{t("wishlistError")}</p> : null}
    </div>
  );
}
