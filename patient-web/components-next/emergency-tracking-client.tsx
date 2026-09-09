"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Step = { title: string; done: boolean; current: boolean };
type Tracking = {
  active: boolean; eta?: number | null; unit?: string; distanceKm?: number | null;
  updatedAt?: string; hasLocation: boolean; steps: Step[];
};

function parseTracking(payload: unknown): Tracking | null {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const r = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  if (!r || typeof r !== "object") return null;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const loc = r.unit_location && typeof r.unit_location === "object" ? (r.unit_location as Record<string, unknown>) : null;
  const stepsRaw = Array.isArray(r.steps) ? r.steps : [];
  return {
    active: r.active !== false,
    eta: num(r.eta_minutes) ?? num(r.eta),
    unit: str(r.unit_label),
    distanceKm: num(r.distance_km),
    updatedAt: loc && typeof loc.updated_at === "string" ? loc.updated_at : undefined,
    hasLocation: !!loc,
    steps: stepsRaw.flatMap((s) => {
      if (!s || typeof s !== "object") return [];
      const o = s as Record<string, unknown>;
      const title = str(o.title_ar) ?? str(o.title);
      if (!title) return [];
      return [{ title, done: o.done === true, current: o.current === true }];
    }),
  };
}

export function EmergencyTrackingClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [failed, setFailed] = useState(false);
  const stopped = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/emergency/tracking", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) { setFailed(true); return; }
      setTracking(parseTracking(await res.json().catch(() => null)));
      setFailed(false);
    } catch { setFailed(true); }
  }, []);

  useEffect(() => {
    stopped.current = false;
    load();
    const timer = setInterval(() => { if (!stopped.current) load(); }, 10000);
    return () => { stopped.current = true; clearInterval(timer); };
  }, [load]);

  if (!tracking && !failed) return <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جارٍ التحميل…" : "Loading…"}</p>;
  if ((failed && !tracking) || (tracking && !tracking.active)) {
    return (
      <div>
        <p role="status">{failed ? (ar ? "تعذر تحميل التتبع" : "Could not load tracking") : (ar ? "لا يوجد طلب إسعاف نشط" : "No active ambulance request")}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={load}>{ar ? "رجوع" : "Back"}</button>
          {!failed ? <Link href={`/${locale}/emergency/sos`}>{ar ? "طلب إسعاف" : "Request ambulance"}</Link> : null}
        </div>
      </div>
    );
  }
  if (!tracking) return null;
  return (
    <div>
      <p role="status"><strong>{tracking.eta ?? "—"} {ar ? "دقيقة" : "min"}</strong> — {ar ? "وقت الوصول المتوقع" : "Estimated arrival"}</p>
      <p>{ar ? "الوحدة:" : "Unit:"} {tracking.unit || (ar ? "جاري التخصيص" : "Assigning")}</p>
      {tracking.hasLocation ? (
        <p>{ar ? `المركبة تنقل موقعها — ${tracking.distanceKm ?? "—"} كم — آخر تحديث ${tracking.updatedAt ?? "—"}` : `Vehicle is sharing location — ${tracking.distanceKm ?? "—"} km — updated ${tracking.updatedAt ?? "—"}`}</p>
      ) : (
        <p role="status">{ar ? "بانتظار مشاركة موقع المركبة…" : "Waiting for vehicle location…"}</p>
      )}
      <ol>
        {tracking.steps.map((s, i) => <li key={i}>{s.done ? "✓ " : s.current ? "→ " : ""}{s.title}</li>)}
      </ol>
      <a href="tel:997">{ar ? "اتصل بالإسعاف (997)" : "Call ambulance (997)"}</a>
    </div>
  );
}
