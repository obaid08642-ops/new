"use client";

import { useState } from "react";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { NabdMark } from "@/components-next/nabd-mark";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getStableDeviceId } from "@/lib/auth/device-id";
import { announceSignedIn } from "@/lib/auth/session-identity";
import { getDirection, type Locale } from "@/lib/i18n";
import styles from "./auth/auth.module.css";

export function AuthWelcome({ locale }: { locale: Locale }) {
  const t = useTranslations("Welcome"); const shared = useTranslations("Shared"); const router = useRouter();
  const [guestBusy, setGuestBusy]=useState(false);
  // Device-bound guest session (parity with mobile): the same browser keeps
  // the same guest account via a stored device id; convert on register.
  async function doGuest() {
    if (guestBusy) return;
    setGuestBusy(true);
    try {
      const deviceId = getStableDeviceId();
      const res = await fetch("/api/auth/guest", { method: "POST", headers: { "content-type": "application/json", "x-nabd-device-id": deviceId } });
      if (!res.ok) throw new Error("guest_failed");
      announceSignedIn();
      router.push(`/${locale}`);
    } catch {
      router.push(`/${locale}/login?guest=blocked`);
    } finally {
      setGuestBusy(false);
    }
  }
  const rtl = getDirection(locale) === "rtl";
  return <div className={styles.welcome}>
    <div className={styles.stage} aria-hidden="true">
      <span className={`${styles.orbit} ${styles.o1}`}><FIcon icon={SERVICE_ICONS.pharmacy.icon} tone={SERVICE_ICONS.pharmacy.tone} chip="none" size={40} /></span>
      <span className={`${styles.orbit} ${styles.o2}`}><FIcon icon={SERVICE_ICONS.consult.icon} tone={SERVICE_ICONS.consult.tone} chip="none" size={36} /></span>
      <span className={`${styles.orbit} ${styles.o3}`}><FIcon icon={SERVICE_ICONS.lab.icon} tone={SERVICE_ICONS.lab.tone} chip="none" size={34} /></span>
      <span className={`${styles.orbit} ${styles.o4}`}><FIcon icon={SERVICE_ICONS.nursing.icon} tone={SERVICE_ICONS.nursing.tone} chip="none" size={38} /></span>
      <NabdMark size={150} variant="text" pulse />
    </div>
    <div className={styles.identity}>
      <h1 className={styles.welcomeWord}>{shared("wordmark")}<span className={styles.plus}>+</span></h1>
      <svg className={styles.ecg} width="160" height="14" viewBox="0 0 160 14" aria-hidden="true"><path d="M0 7h58l6-6 7 12 6-10 4 4h79" /></svg>
      <p className={styles.tagline}>{t("tagline")}</p>
    </div>
    <div className={styles.cta}>
      <div className={styles.pair}>
        <Button variant="primary" size="lg" fullWidth label={t("register")} onClick={() => router.push(`/${locale}/register`)} />
        <Button variant="outline" size="lg" fullWidth label={t("login")} onClick={() => router.push(`/${locale}/login`)} />
      </div>
      <button type="button" className={styles.guestLink} onClick={doGuest} disabled={guestBusy}>
        {t("guest")}<Icon name={rtl ? "caret-left" : "caret-right"} size={16} tone="currentColor" />
      </button>
    </div>
  </div>;
}
