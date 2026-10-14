"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { LinkButton } from "./link-button";
import styles from "./auth/auth.module.css";

type State = "unknown" | "granted" | "denied" | "unsupported";

export function OnboardingPermissionsClient({ locale }: { locale: string }) {
  const t = useTranslations("Onboarding");
  const [location, setLocation] = useState<State>("unknown");
  const [notif, setNotif] = useState<State>("unknown");

  async function askLocation() {
    try {
      if (!("geolocation" in navigator)) { setLocation("unsupported"); return; }
      await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }));
      setLocation("granted");
    } catch { setLocation("denied"); }
  }

  async function askNotif() {
    try {
      if (!("Notification" in window)) { setNotif("unsupported"); return; }
      const result = await Notification.requestPermission();
      setNotif(result === "granted" ? "granted" : "denied");
    } catch { setNotif("denied"); }
  }

  const label = (state: State) =>
    state === "granted" ? t("allowed") : state === "denied" ? t("denied") : state === "unsupported" ? t("unsupported") : t("allow");

  return (
    <div className={styles.form}>
      <section className={styles.perm} aria-label={t("locationTitle")}>
        <FIcon icon={SERVICE_ICONS.map.icon} tone={SERVICE_ICONS.map.tone} size={44} />
        <div className={styles.permText}>
          <h2 className={styles.permTitle}>{t("locationTitle")}</h2>
          <p className={styles.hint}>{t("locationBody")}</p>
        </div>
        <Button variant="outline" size="sm" label={label(location)} onClick={askLocation} disabled={location !== "unknown"} />
      </section>
      <section className={styles.perm} aria-label={t("notificationsTitle")}>
        <FIcon icon={SERVICE_ICONS.points.icon} tone={SERVICE_ICONS.points.tone} size={44} />
        <div className={styles.permText}>
          <h2 className={styles.permTitle}>{t("notificationsTitle")}</h2>
          <p className={styles.hint}>{t("notificationsBody")}</p>
        </div>
        <Button variant="outline" size="sm" label={label(notif)} onClick={askNotif} disabled={notif !== "unknown"} />
      </section>
      <div className={styles.actions}>
        <LinkButton href={`/${locale}/welcome`} label={t("start")} />
        <p className={styles.foot}><Link className={styles.link} href={`/${locale}/welcome`}>{t("skip")}</Link></p>
      </div>
    </div>
  );
}
