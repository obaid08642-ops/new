"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Active = { id?: string; eta?: number | null; status?: string; vehicle?: string; paramedic?: string; paramedicPhone?: string };

function parseActive(payload: unknown): Active | null {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const r = (root.data && typeof root.data === "object" ? root.data : Array.isArray(root.data) ? root.data[0] : root) as Record<string, unknown>;
  if (!r || typeof r !== "object") return null;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const label = str(r.unit_label);
  return {
    id: str(r.id),
    eta: num(r.eta_minutes) ?? num(r.eta),
    status: str(r.status_text) ?? str(r.status),
    vehicle: label ? (r.id ? `سيارة الإسعاف ${label}` : label) : undefined,
    paramedic: str(r.paramedic_name),
    paramedicPhone: str(r.paramedic_phone) ?? str(r.unit_phone),
  };
}

export function EmergencySosActiveClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [active, setActive] = useState<Active | null>(null);
  const [error, setError] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const stopped = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/emergency/my/active", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) { setError(true); return; }
      setActive(parseActive(await res.json().catch(() => null)));
      setError(false);
    } catch { setError(true); }
  }, []);

  useEffect(() => {
    stopped.current = false;
    load();
    const timer = setInterval(() => { if (!stopped.current) load(); }, 10000);
    return () => { stopped.current = true; clearInterval(timer); };
  }, [load]);

  async function cancel() {
    if (!active?.id) { await load(); return; }
    if (!window.confirm(ar ? "تأكيد إلغاء الاستغاثة؟" : "Confirm cancelling the SOS?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/patient/emergency/${encodeURIComponent(active.id)}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-sos-cancel-${active.id}-${Date.now()}` },
        body: "{}",
        credentials: "same-origin",
      });
      if (!res.ok) { setError(true); return; }
      router.push(`/${locale}`);
    } catch { setError(true); }
    finally { setCancelling(false); }
  }

  if (!active && !error) return <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جارٍ تحديد حالة النداء…" : "Loading SOS status…"}</p>;
  if (error && !active) return <p role="alert">{ar ? "تعذر تحميل حالة الطوارئ" : "Could not load emergency status"}</p>;
  if (!active) return null;
  return (
    <div>
      <p role="status">{ar ? "يتم تحديث حالة النداء تلقائياً كل 10 ثوانٍ" : "SOS status refreshes automatically every 10 seconds"}</p>
      <section aria-label={ar ? "الحالة" : "Status"}>
        <p><strong>{active.eta ?? "-"} {ar ? "دقائق" : "min"}</strong> — {ar ? "الوقت المقدر (ETA)" : "Estimated time (ETA)"}</p>
        {active.status ? <p>{active.status}</p> : null}
        <p>{active.vehicle || (ar ? "جاري تخصيص سيارة الإسعاف…" : "Assigning an ambulance…")}</p>
      </section>
      <section aria-label={ar ? "المسعف" : "Paramedic"}>
        <p>{ar ? "المسعف:" : "Paramedic:"} {active.paramedic || (ar ? "فريق الطوارئ" : "Emergency team")}</p>
        {active.paramedicPhone ? <a href={`tel:${active.paramedicPhone}`}>{ar ? "اتصال بالمسعف" : "Call paramedic"}</a> : null}
      </section>
      <section aria-label={ar ? "تعليمات هامة" : "Important instructions"}>
        <ul>
          <li>{ar ? "ابقَ في مكان آمن وواضح لسيارة الإسعاف" : "Stay in a safe, visible place for the ambulance"}</li>
          <li>{ar ? "أبقِ هاتفك متاحاً لاتصال الفريق" : "Keep your phone reachable for the crew"}</li>
          <li>{ar ? "لا تقُد بنفسك إن كنت تشعر بدوار" : "Do not drive yourself if you feel dizzy"}</li>
        </ul>
      </section>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href="tel:997">{ar ? "اتصال بغرفة العمليات" : "Call operations room"}</a>
        <button type="button" onClick={cancel} disabled={cancelling}>{ar ? "إلغاء الطلب" : "Cancel request"}</button>
      </div>
    </div>
  );
}
