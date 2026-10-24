"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import styles from "./product-detail.module.css";

/**
 * The share button of the product page (the app's share over the gallery): the browser's share sheet with the product's name
 * and link where it exists, else the link is copied and the button says so. Nothing is sent anywhere by the site.
 */
export function ProductShare({ name, url }: { name: string; url: string }) {
  const t = useTranslations("PublicProduct");
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function share() {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch (error) {
      // closing the share sheet is not a failure
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), 2500);
  }

  return (
    <div className={styles.share}>
      <Button variant="outline" size="sm" label={state === "copied" ? t("shareCopied") : t("share")} onClick={() => void share()} />
      {state === "failed" ? <p role="status" className={styles.wishlistError}>{t("shareFailed")}</p> : null}
    </div>
  );
}
