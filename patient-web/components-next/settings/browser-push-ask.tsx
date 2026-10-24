"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Notice } from "@/components-next/consult/consult-parts";
import { Button } from "@/components-next/ui-generated/components/Button";
import { enableWebPush } from "@/lib/web-push";
import styles from "./settings.module.css";

type Status = "default" | "denied" | null;

/**
 * The in-context notification prompt of the app (NotificationAsk), for this browser. It reads what the browser already says
 * without asking. Allowed or unsupported: nothing is drawn. Not asked yet: a short reason and "Turn on", which shows the
 * browser's own dialog. Refused: the dialog cannot be shown again, so it says so (the browser's site settings undo it).
 */
export function BrowserPushAsk() {
  const t = useTranslations("NotificationSettings");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  const read = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus(null);
      return;
    }
    setStatus(Notification.permission === "default" ? "default" : Notification.permission === "denied" ? "denied" : null);
  }, []);

  useEffect(() => {
    read();
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, [read]);

  async function turnOn() {
    setBusy(true);
    try {
      await enableWebPush();
    } finally {
      setBusy(false);
      read();
    }
  }

  if (status === null) return null;
  if (status === "denied") return <Notice warn>{t("pushBlocked")}</Notice>;
  return (
    <div className={styles.askBlock}>
      <Notice>{t("pushAsk")}</Notice>
      <Button label={t("pushTurnOn")} size="md" loading={busy} onClick={() => void turnOn()} />
    </div>
  );
}
