"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const TIMES = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];

export function DiagnosticsCheckoutForm({
  locale,
  items,
  labId,
  initialLocation,
}: {
  locale: string;
  items: string[];
  labId: string;
  initialLocation: "home" | "facility";
}) {
  const router = useRouter();
  const days = useMemo(() => {
    const out: Array<{ iso: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      out.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        label: new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
          weekday: "long",
          day: "numeric",
          month: "numeric",
        }).format(d),
      });
    }
    return out;
  }, [locale]);
  const [day, setDay] = useState(days[0]?.iso || "");
  const [time, setTime] = useState<string | null>(null);
  const [method, setMethod] = useState<"cash" | "card" | "insurance">(initialLocation === "home" ? "card" : "cash");
  const [address, setAddress] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  const allowedMethods = initialLocation === "home" ? ["card", "insurance"] : ["cash", "card", "insurance"];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!time) {
      setError(ar ? "اختر اليوم والوقت" : "Select day and time");
      return;
    }
    if (initialLocation === "home" && !address.trim()) {
      setError(ar ? "أدخل عنوان السحب المنزلي" : "Enter the home collection address");
      return;
    }
    if (method === "insurance" && !insuranceProvider.trim()) {
      setError(ar ? "أدخل شركة التأمين" : "Enter the insurance company");
      return;
    }
    const scheduled = new Date(`${day}T${time}:00`);
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now()) {
      setError(ar ? "الموعد في الماضي — اختر وقتاً لاحقاً" : "Time is in the past — choose a later time");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/diagnostics/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `web-diag-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        },
        body: JSON.stringify({
          items: items.map((service_id) => ({ service_id })),
          provider_account_id: labId,
          scheduled_at: scheduled.toISOString(),
          location_type: initialLocation,
          payment_method: method,
          address: address.trim() || undefined,
          insurance_provider: method === "insurance" ? insuranceProvider.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر إنشاء الحجز" : "Could not create booking"));
        return;
      }
      const booking = (data as { data?: { id?: string }; id?: string })?.data ?? data;
      const bookingId = (booking as { id?: string })?.id;
      if (bookingId) router.push(`/${locale}/diagnostics/labs/${encodeURIComponent(bookingId)}`);
      else router.push(`/${locale}/diagnostics/bookings`);
      router.refresh();
    } catch {
      setError(ar ? "تعذر إنشاء الحجز" : "Could not create booking");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {days.map((d) => (
          <button key={d.iso} type="button" onClick={() => setDay(d.iso)} style={{ fontWeight: day === d.iso ? 800 : 400 }}>
            {d.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {TIMES.map((t) => (
          <button key={t} type="button" onClick={() => setTime(t)} style={{ fontWeight: time === t ? 800 : 400 }}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {allowedMethods.map((m) => (
          <button key={m} type="button" onClick={() => setMethod(m as "cash" | "card" | "insurance")} style={{ fontWeight: method === m ? 800 : 400 }}>
            {m === "cash" ? (ar ? "نقدي" : "Cash") : m === "card" ? (ar ? "بطاقة" : "Card") : (ar ? "تأمين" : "Insurance")}
          </button>
        ))}
      </div>
      {initialLocation === "home" ? (
        <label style={{ display: "grid", gap: 6 }}>
          <span>{ar ? "عنوان السحب المنزلي" : "Home collection address"}</span>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} maxLength={1000} rows={2} required />
        </label>
      ) : null}
      {method === "insurance" ? (
        <label style={{ display: "grid", gap: 6 }}>
          <span>{ar ? "شركة التأمين" : "Insurance company"}</span>
          <input value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} maxLength={128} required />
        </label>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (ar ? "جارٍ الحجز..." : "Booking...") : (ar ? "تأكيد الحجز" : "Confirm booking")}</button>
    </form>
  );
}
