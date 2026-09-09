"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Tracking = { eta?: number | null; techName?: string; techPhone?: string };

function parseTracking(payload: unknown): Tracking {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const t = (root.tracking && typeof root.tracking === "object" ? root.tracking : root) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  return {
    eta: num(t.eta) ?? num(t.eta_minutes),
    techName: str(t.techName) ?? str(t.tech_name),
    techPhone: str(t.techPhone) ?? str(t.tech_phone),
  };
}

export function DiagnosticsTechnicianTrackingClient({ bookingId, locale }: { bookingId: string; locale: string }) {
  const ar = locale === "ar";
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState(false);
  const stopped = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/patient/labs/bookings/${encodeURIComponent(bookingId)}/tracking`, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) { setError(true); return; }
      setTracking(parseTracking(await res.json().catch(() => null)));
      setError(false);
    } catch { setError(true); }
  }, [bookingId]);

  useEffect(() => {
    stopped.current = false;
    load();
    const timer = setInterval(() => { if (!stopped.current) load(); }, 15000);
    return () => { stopped.current = true; clearInterval(timer); };
  }, [load]);

  if (!tracking && !error) return <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جارٍ التحميل…" : "Loading…"}</p>;
  if (error && !tracking) return <p role="alert">{ar ? "تعذر تحميل التتبع" : "Could not load tracking"}</p>;
  if (!tracking) return null;
  return (
    <div>
      <section aria-label={ar ? "الوصول المتوقع" : "Estimated arrival"}>
        <h2>{ar ? "الوقت المقدر للوصول" : "Estimated arrival"}</h2>
        <p role="status">{tracking.eta !== null && tracking.eta !== undefined ? (ar ? `${tracking.eta} دقيقة` : `${tracking.eta} min`) : (ar ? "قريب منك" : "Nearby")}</p>
        {tracking.techName ? <p>{tracking.techName} — {ar ? "أخصائي سحب معتمد" : "Certified collector"}</p> : null}
        {tracking.techPhone ? <a href={`tel:${tracking.techPhone}`}>{ar ? "اتصال بالأخصائي" : "Call collector"}</a> : null}
      </section>
      <section aria-label={ar ? "نصائح الاستقبال" : "Reception tips"}>
        <h2>{ar ? "نصائح استقبال الأخصائي" : "Receiving the collector"}</h2>
        <ul>
          <li>{ar ? "جهّز الهوية وطلب التحليل" : "Have your ID and test order ready"}</li>
          <li>{ar ? "التزم بالصيام المطلوب قبل السحب" : "Observe the required fasting before collection"}</li>
          <li>{ar ? "أخبر الأخصائي بأي أدوية تتناولها" : "Tell the collector about any medications you take"}</li>
        </ul>
      </section>
    </div>
  );
}
