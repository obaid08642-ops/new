"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type BookingService = { id: string; name: string; price?: number };
export type BookingAddress = { id: string; label: string };

function nextDays(count: number, locale: string): Array<{ iso: string; label: string }> {
  const out: Array<{ iso: string; label: string }> = [];
  // Gregorian by default; Hijri automatically when the device uses it.
  let calendar = "gregory";
  try {
    const deviceCal = Intl.DateTimeFormat().resolvedOptions().calendar || "";
    if (/islamic|hijri/i.test(deviceCal)) calendar = "islamic-umalqura";
  } catch {}
  const tag = `${locale === "ar" ? "ar-SA" : "en-US"}-u-ca-${calendar}`;
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "numeric" }).format(d),
    });
  }
  return out;
}

const TIMES = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];

export function NursingBookingForm({
  locale,
  services,
  addresses,
}: {
  locale: string;
  services: BookingService[];
  addresses: BookingAddress[];
}) {
  const router = useRouter();
  const days = useMemo(() => nextDays(7, locale), [locale]);
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [day, setDay] = useState(days[0]?.iso || "");
  const [time, setTime] = useState<string | null>(null);
  const [addressId, setAddressId] = useState(addresses.find((a) => a)?.id || "");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"cash" | "card" | "insurance">("cash");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!serviceId) {
      setError(ar ? "اختر الخدمة" : "Select a service");
      return;
    }
    if (!time) {
      setError(ar ? "اختر اليوم والوقت" : "Select day and time");
      return;
    }
    const scheduled = new Date(`${day}T${time}:00`);
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now()) {
      setError(ar ? "الموعد في الماضي — اختر وقتاً لاحقاً" : "Time is in the past — choose a later time");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/nursing/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `web-nursing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        },
        body: JSON.stringify({
          service_id: serviceId,
          scheduled_at: scheduled.toISOString(),
          address_id: addressId || undefined,
          notes: notes.trim() || undefined,
          payment_method: method,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر إنشاء الحجز" : "Could not create booking"));
        return;
      }
      const booking = (data as { data?: { id?: string }; id?: string })?.data ?? data;
      const bookingId = (booking as { id?: string })?.id;
      if (method === "insurance") {
        router.push(`/${locale}/nursing/visits${bookingId ? `/${encodeURIComponent(bookingId)}` : ""}`);
      } else if (bookingId) {
        router.push(`/${locale}/nursing/visits/${encodeURIComponent(bookingId)}`);
      } else {
        router.push(`/${locale}/nursing/visits`);
      }
      router.refresh();
    } catch {
      setError(ar ? "تعذر إنشاء الحجز" : "Could not create booking");
    } finally {
      setSaving(false);
    }
  }

  if (!services.length) return null;

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "الخدمة" : "Service"}</span>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.price !== undefined ? ` — ${s.price}` : ""}</option>
          ))}
        </select>
      </label>
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
      {addresses.length > 0 ? (
        <label style={{ display: "grid", gap: 6 }}>
          <span>{ar ? "العنوان" : "Address"}</span>
          <select value={addressId} onChange={(e) => setAddressId(e.target.value)}>
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </label>
      ) : (
        <p><a href={`/${locale}/profile/addresses`}>{ar ? "أضف عنواناً أولاً" : "Add an address first"}</a></p>
      )}
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "ملاحظات (اختياري)" : "Notes (optional)"}</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        {(["cash", "card", "insurance"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMethod(m)} style={{ fontWeight: method === m ? 800 : 400 }}>
            {m === "cash" ? (ar ? "نقدي" : "Cash") : m === "card" ? (ar ? "بطاقة" : "Card") : (ar ? "تأمين" : "Insurance")}
          </button>
        ))}
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (ar ? "جارٍ الحجز…" : "Booking…") : (ar ? "تأكيد الحجز" : "Confirm booking")}</button>
    </form>
  );
}
