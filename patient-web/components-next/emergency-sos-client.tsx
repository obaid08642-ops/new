"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

const QUICK = [
  { n: "997", ar: "إسعاف", en: "Ambulance" },
  { n: "999", ar: "شرطة", en: "Police" },
  { n: "998", ar: "إطفاء", en: "Fire" },
  { n: "993", ar: "مرور", en: "Traffic" },
];

export function EmergencySosClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function trigger() {
    if (!window.confirm(ar ? "تأكيد طلب الطوارئ؟" : "Confirm emergency request?")) return;
    setSending(true); setError(null);
    let location: { lat: number; lng: number } | null = null;
    try {
      if ("geolocation" in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }));
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
    } catch { location = null; }
    try {
      const res = await fetch("/api/patient/emergency/trigger", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-sos-${Date.now()}` },
        body: JSON.stringify({ location, type: "ambulance" }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => null);
      const id = data && typeof data === "object" ? (data as Record<string, unknown>).id ?? ((data as Record<string, unknown>).data as Record<string, unknown> | undefined)?.id : null;
      if (!res.ok || typeof id !== "string") { window.location.href = "tel:997"; return; }
      router.push(`/${locale}/emergency/sos-active?emergencyId=${encodeURIComponent(id)}`);
    } catch { window.location.href = "tel:997"; }
    finally { setSending(false); }
  }

  return (
    <div>
      <button type="button" onClick={trigger} disabled={sending} aria-label="SOS">
        {sending ? <LoaderCircle size={20} aria-hidden="true" /> : "SOS"}
        <span>{sending ? (ar ? "جاري الإرسال…" : "Sending…") : (ar ? "اضغط لطلب إسعاف فوري" : "Tap for immediate ambulance")}</span>
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <section aria-label={ar ? "اتصال سريع" : "Quick call"}>
        <h2>{ar ? "اتصال سريع" : "Quick call"}</h2>
        <ul>
          {QUICK.map((q) => <li key={q.n}><a href={`tel:${q.n}`}>{ar ? q.ar : q.en} — {q.n}</a></li>)}
          <li><a href="tel:920016110">{ar ? "مركز السموم" : "Poison center"} — 920016110</a></li>
        </ul>
      </section>
      <Link href={`/${locale}/emergency/tracking`}>{ar ? "تتبع الإسعاف" : "Track ambulance"}</Link>
    </div>
  );
}
