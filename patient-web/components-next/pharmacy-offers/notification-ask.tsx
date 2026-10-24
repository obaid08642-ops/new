"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { enableWebPush } from "@/lib/web-push";
import styles from "./offers.module.css";

type Status = "hidden" | "ask" | "blocked" | "failed";

/**
 * The app's in-context notification prompt (NotificationAsk), for the waiting-for-offers state: the browser's own
 * permission decides what is drawn, and the browser's dialog is shown only after the patient presses the button.
 * Allowed or unsupported: nothing is drawn. Not asked yet: a short reason and "Turn on". Refused: the dialog cannot be
 * shown again, so the notice says so (the site settings of the browser change it).
 */
export function NotificationAsk() {
  const t = useTranslations("PharmacyOffers");
  const [status, setStatus] = useState<Status>("hidden");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") setStatus("blocked");
    else if (Notification.permission === "default") setStatus("ask");
  }, []);

  async function turnOn() {
    setBusy(true);
    const result = await enableWebPush().catch(() => "unavailable" as const);
    setBusy(false);
    setStatus(result === "subscribed" ? "hidden" : result === "denied" ? "blocked" : result === "unsupported" ? "hidden" : "failed");
  }

  if (status === "hidden") return null;
  if (status === "blocked") return <p className={`${styles.notice} ${styles.noticeWarn}`} role="status">{t("notifAskBlocked")}</p>;
  return (
    <div className={`${styles.notice} ${styles.noticeAsk}`} role="status">
      <p className={styles.noticeText}>{status === "failed" ? t("notifAskFailed") : t("notifAskOffers")}</p>
      <Button label={t("notifAskTurnOn")} variant="secondary" size="sm" loading={busy} onClick={() => void turnOn()} />
    </div>
  );
}
