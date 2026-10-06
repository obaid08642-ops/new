"use client";

import Link from "next/link";
import { useState } from "react";

export function OnboardingPermissionsClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const [location, setLocation] = useState<"unknown" | "granted" | "denied">("unknown");
  const [notif, setNotif] = useState<"unknown" | "granted" | "denied" | "unsupported">("unknown");

  async function askLocation() {
    try {
      if (!("geolocation" in navigator)) { setLocation("denied"); return; }
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

  return (
    <div>
      <section aria-label={ar ? "الموقع" : "Location"}>
        <h2>{ar ? "الموقع" : "Location"}</h2>
        <p>{ar ? "نستخدم موقعك لاقتراح أقرب الأطباء والصيدليات وحساب التوصيل." : "We use your location to suggest nearby doctors, pharmacies and delivery."}</p>
        <button type="button" onClick={askLocation} disabled={location === "granted"}>
          {location === "granted" ? (ar ? "تم السماح ✓" : "Granted ✓") : (ar ? "السماح بالموقع" : "Allow location")}
        </button>
      </section>
      <section aria-label={ar ? "الإشعارات" : "Notifications"}>
        <h2>{ar ? "الإشعارات" : "Notifications"}</h2>
        <p>{ar ? "تنبيهات المواعيد والأدوية ونتائج التحاليل." : "Appointment, medication and lab-result alerts."}</p>
        <button type="button" onClick={askNotif} disabled={notif === "granted"}>
          {notif === "granted" ? (ar ? "تم السماح ✓" : "Granted ✓") : (ar ? "السماح بالإشعارات" : "Allow notifications")}
        </button>
      </section>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/${locale}/welcome`}>{ar ? "ابدأ" : "Get started"}</Link>
      </nav>
    </div>
  );
}
