"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, FIcon, SERVICE_ICONS } from "@/components-next/ui-generated";
import styles from "./auth/auth.module.css";

type State = "unknown" | "granted" | "denied" | "unsupported";

export function OnboardingPermissionsClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
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

  const label = (state: State, allow: string) =>
    state === "granted" ? (ar ? "تم السماح" : "Allowed") : state === "denied" ? (ar ? "غير مسموح" : "Not allowed") : state === "unsupported" ? (ar ? "غير متاح في هذا المتصفح" : "Not available in this browser") : allow;

  return (
    <div className={styles.form}>
      <section className={styles.perm} aria-label={ar ? "الموقع" : "Location"}>
        <FIcon icon={SERVICE_ICONS.map.icon} tone={SERVICE_ICONS.map.tone} size={44} />
        <div className={styles.permText}>
          <h2 className={styles.permTitle}>{ar ? "الموقع" : "Location"}</h2>
          <p className={styles.hint}>{ar ? "لنقترح أقرب الأطباء والصيدليات ونحسب التوصيل." : "To suggest nearby doctors and pharmacies and work out delivery."}</p>
        </div>
        <Button variant="outline" size="sm" label={label(location, ar ? "السماح" : "Allow")} onClick={askLocation} disabled={location !== "unknown"} />
      </section>
      <section className={styles.perm} aria-label={ar ? "الإشعارات" : "Notifications"}>
        <FIcon icon={SERVICE_ICONS.points.icon} tone={SERVICE_ICONS.points.tone} size={44} />
        <div className={styles.permText}>
          <h2 className={styles.permTitle}>{ar ? "الإشعارات" : "Notifications"}</h2>
          <p className={styles.hint}>{ar ? "تنبيهات المواعيد والأدوية ونتائج التحاليل." : "Appointment, medication and lab-result alerts."}</p>
        </div>
        <Button variant="outline" size="sm" label={label(notif, ar ? "السماح" : "Allow")} onClick={askNotif} disabled={notif !== "unknown"} />
      </section>
      <div className={styles.actions}>
        <Link href={`/${locale}/welcome`} className={styles.fullLink}><Button variant="primary" size="lg" fullWidth label={ar ? "ابدأ" : "Get started"} /></Link>
        <p className={styles.foot}><Link className={styles.link} href={`/${locale}/welcome`}>{ar ? "تخطي" : "Skip"}</Link></p>
      </div>
    </div>
  );
}
