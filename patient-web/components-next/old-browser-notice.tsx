"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { isSupportedBrowser } from "@/lib/device-support";

/**
 * P15.10 — older devices get a clear message instead of a broken app.
 *
 * Evaluated once after mount (never during SSR: there is no navigator there,
 * and a server/client mismatch would flash the banner for everyone). Unknown
 * agents pass the gate, so this only ever appears for browsers that are
 * provably below the documented floors.
 */
export function OldBrowserNotice() {
  const t = useTranslations("Network");
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (typeof navigator === "undefined" || !navigator.userAgent) return;
      setVisible(!isSupportedBrowser(navigator.userAgent).supported);
    } catch {
      /* a UA read must never break the page */
    }
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div
      role="status"
      style={{
        background: "#1E332E",
        color: "#FFE9C7",
        padding: "10px 16px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        justifyContent: "center",
        fontSize: ".85rem",
      }}
    >
      <div style={{ display: "grid", gap: 4, maxWidth: 640 }}>
        <strong>{t("oldBrowser.title")}</strong>
        <span style={{ opacity: 0.9 }}>{t("oldBrowser.body")}</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("dismiss")}
        style={{ background: "transparent", border: "none", color: "#FFE9C7", fontSize: "1.1rem", cursor: "pointer", padding: 4 }}
      >
        ×
      </button>
    </div>
  );
}
