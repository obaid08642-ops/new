"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Step = { title: string; time?: string; done?: boolean };
type Tracking = { state?: string; eta?: number | null; techName?: string; scheduledAt?: string; steps: Step[] };

const FALLBACK_STEPS = (techAssigned: boolean, ar: boolean): Step[] => [
  { title: ar ? "تم استلام الطلب" : "Order received", done: true },
  { title: ar ? "تعيين أخصائي السحب" : "Collector assigned", done: techAssigned },
  { title: ar ? "الأخصائي في الطريق" : "Collector on the way" },
  { title: ar ? "تم سحب العينة" : "Sample collected" },
  { title: ar ? "العينة في المختبر" : "Sample at lab" },
  { title: ar ? "النتيجة جاهزة" : "Result ready" },
];

function parseTracking(payload: unknown, ar: boolean): Tracking {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const t = (root.tracking && typeof root.tracking === "object" ? root.tracking : root) as Record<string, unknown>;
  const b = (root.booking && typeof root.booking === "object" ? root.booking : null) as Record<string, unknown> | null;
  const stepsRaw = Array.isArray(t.steps) ? t.steps : [];
  const steps: Step[] = stepsRaw.flatMap((s) => {
    if (!s || typeof s !== "object") return [];
    const o = s as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : typeof o.title_ar === "string" ? o.title_ar : null;
    if (!title) return [];
    return [{ title, time: typeof o.time === "string" ? o.time : undefined, done: o.done === true }];
  });
  const techName = typeof t.techName === "string" ? t.techName : typeof t.tech_name === "string" ? t.tech_name : undefined;
  return {
    state: b && typeof b.state === "string" ? b.state : undefined,
    eta: typeof t.eta === "number" ? t.eta : typeof t.eta_minutes === "number" ? t.eta_minutes : null,
    techName,
    scheduledAt: b && typeof b.scheduled_at === "string" ? b.scheduled_at : undefined,
    steps: steps.length > 0 ? steps : FALLBACK_STEPS(!!techName, ar),
  };
}

export function DiagnosticsSampleTrackingClient({ bookingId, locale }: { bookingId: string; locale: string }) {
  const ar = locale === "ar";
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState(false);
  const stopped = useRef(false);

  const load = useCallback(async () => {
    try {
      const [bookingRes, trackingRes] = await Promise.all([
        fetch(`/api/patient/labs/bookings/${encodeURIComponent(bookingId)}`, { cache: "no-store", credentials: "same-origin" }),
        fetch(`/api/patient/labs/bookings/${encodeURIComponent(bookingId)}/tracking`, { cache: "no-store", credentials: "same-origin" }),
      ]);
      const booking = bookingRes.ok ? await bookingRes.json().catch(() => null) : null;
      const trackingJson = trackingRes.ok ? await trackingRes.json().catch(() => null) : null;
      setTracking(parseTracking({ booking, tracking: trackingJson }, ar));
      setError(false);
    } catch { setError(true); }
  }, [bookingId, ar]);

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
      <section aria-label={ar ? "الملخص" : "Summary"}>
        <p role="status">{ar ? "الحالة:" : "Status:"} {tracking.state || (ar ? "قيد المتابعة" : "In progress")}</p>
        {tracking.eta !== null && tracking.eta !== undefined ? <p>{ar ? `الوصول خلال ${tracking.eta} دقيقة` : `Arriving in ${tracking.eta} min`}</p> : null}
        {tracking.techName ? <p>{ar ? `أخصائي السحب: ${tracking.techName}` : `Collector: ${tracking.techName}`}</p> : null}
        {tracking.scheduledAt ? <p>{ar ? "الموعد المحدد:" : "Scheduled:"} {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(tracking.scheduledAt))}</p> : null}
      </section>
      <section aria-label={ar ? "تعليمات ما قبل سحب العينة" : "Before sample collection"}>
        <h2>{ar ? "تعليمات ما قبل سحب العينة" : "Before sample collection"}</h2>
        <p>{ar ? "الصيام 8–12 ساعة قبل السحب ما لم يخبرك الطبيب بغير ذلك." : "Fast 8–12 hours before collection unless your doctor says otherwise."}</p>
      </section>
      <section aria-label={ar ? "مراحل تنفيذ الفحص" : "Test progress"}>
        <h2>{ar ? "مراحل تنفيذ الفحص" : "Test progress"}</h2>
        <ol>
          {tracking.steps.map((step, i) => (
            <li key={i}>{step.done ? "✓ " : ""}{step.title}{step.time ? ` — ${step.time}` : ""}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
