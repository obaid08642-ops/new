"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, LoaderCircle } from "lucide-react";

export function LabBookingForm({ locale, serviceId, providerId, serviceName, homeEligible }: { locale: string; serviceId: string; providerId: string; serviceName: string; homeEligible: boolean }) {
  const router = useRouter();
  const [locationType, setLocationType] = useState<"facility" | "home">("facility");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "insurance">("card");
  const [scheduledAt, setScheduledAt] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const key = useRef<string | null>(null);
  async function submit() {
    if (!scheduledAt || state === "loading") { setError("اختر موعداً صحيحاً"); return; }
    if (locationType === "home" && paymentMethod === "insurance" && !documentUrl.trim()) { setError("الزيارة المنزلية بالتأمين تتطلب توصية طبية أو موافقة مسبقة"); return; }
    key.current ??= crypto.randomUUID(); setState("loading"); setError("");
    const documents = documentUrl.trim() ? [{ kind: "doctor_request", url_or_b64: documentUrl.trim() }] : [];
    try {
      const r = await fetch("/api/patient/labs/bookings", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key.current }, body: JSON.stringify({ items: [{ service_id: serviceId }], provider_account_id: providerId, scheduled_at: new Date(scheduledAt).toISOString(), location_type: locationType, payment_method: paymentMethod, documents }) });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.id) throw new Error(data?.message || "booking_failed");
      router.push(`/${locale}/diagnostics/labs/${data.id}`);
    } catch (e: any) { setState("error"); setError(e?.message === "slot_taken" ? "الموعد لم يعد متاحاً" : "تعذر إنشاء الحجز — حاول مرة أخرى"); }
  }
  return <section style={{ display: "grid", gap: 14, padding: 20, border: "1px solid var(--line)", borderRadius: "var(--radius-xl)", background: "var(--surface)" }}>
    <h2><CalendarClock size={18} aria-hidden="true" /> حجز {serviceName}</h2>
    <label>الموقع<select value={locationType} onChange={e => setLocationType(e.target.value as "facility" | "home")}><option value="facility">في المنشأة</option><option value="home" disabled={!homeEligible}>سحب منزلي{!homeEligible ? " — غير متاح" : ""}</option></select></label>
    <label>الموعد<input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required /></label>
    <label>طريقة الدفع<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as "cash" | "card" | "insurance")}><option value="card">بطاقة إلكترونية</option><option value="cash" disabled={locationType === "home"}>نقد في المنشأة</option><option value="insurance">تأمين</option></select></label>
    {paymentMethod === "insurance" ? <label>رابط التوصية/الموافقة الطبية (عند الحاجة)<input value={documentUrl} onChange={e => setDocumentUrl(e.target.value)} placeholder="https://…" /></label> : null}
    {error ? <p role="alert" style={{ color: "var(--danger, #b42318)" }}>{error}</p> : null}
    <button type="button" onClick={submit} disabled={state === "loading"}>{state === "loading" ? <LoaderCircle size={17} aria-hidden="true" /> : <CalendarClock size={17} aria-hidden="true" />} {state === "loading" ? "جارٍ الحجز…" : "تأكيد الحجز"}</button>
  </section>;
}
