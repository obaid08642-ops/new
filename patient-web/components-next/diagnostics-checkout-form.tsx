"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isPastSlot } from "@/lib/datetime";

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
    // Gregorian by default; Hijri automatically when the device uses it.
    let calendar = "gregory";
    try {
      const deviceCal = Intl.DateTimeFormat().resolvedOptions().calendar || "";
      if (/islamic|hijri/i.test(deviceCal)) calendar = "islamic-umalqura";
    } catch {}
    const tag = `${locale === "ar" ? "ar-SA" : "en-US"}-u-ca-${calendar}`;
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      out.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        label: new Intl.DateTimeFormat(tag, {
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
    // P15.9: answered against the server-anchored clock, so a device set ±1
    // day cannot hide future slots or admit past ones.
    if (isPastSlot(scheduled.getTime())) {
      setError(ar ? "الموعد في الماضي — اختر وقتاً لاحقاً" : "Time is in the past — choose a later time");
      return;
    }
    setSaving(true);
    try {
      // F74: create ONE parent diagnostics order containing lab+radiology lines.
      const res = await fetch("/api/diagnostics/orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `web-diag-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        },
        body: JSON.stringify({
          lines: items.map((service_id) => ({
            kind: service_id.startsWith("rad_") ? "radiology" : "lab",
            service_id: service_id.replace(/^(rad_|lab_)/, ""),
            provider_account_id: labId,
          })),
          scheduled_at: scheduled.toISOString(),
          location_type: initialLocation,
          payment_method: method,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر إنشاء الطلب" : "Could not create order"));
        return;
      }
      const order = (data as { data?: { id?: string }; id?: string })?.data ?? data;
      const orderId = (order as { id?: string })?.id;
      if (!orderId) {
        setError(ar ? "تعذر إنشاء الطلب" : "Could not create order");
        return;
      }

      // Pay once for the total (card payments only; cash/insurance are handled at the lab)
      if (method === "card") {
        const payRes = await fetch("/api/payments/intent/diagnostics", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": `web-diag-pay-${orderId}`,
          },
          body: JSON.stringify({ order_id: orderId, method: "card" }),
        });
        const payData = await payRes.json().catch(() => null);
        if (!payRes.ok) {
          setError((payData as { message?: string })?.message || (ar ? "تعذر الدفع" : "Payment failed"));
          return;
        }
        const checkoutUrl = (payData as { checkout_url?: string })?.checkout_url;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
      }

      // Clear cart only after payment success (or immediately for cash/insurance)
      await fetch("/api/diagnostics/cart", { method: "DELETE" }).catch(() => null);
      // The website cart lives in localStorage (diagnostics-cart-client.tsx): clear it too, or the ordered tests stay in the cart.
      try { localStorage.removeItem("nabd-diagnostics-cart"); } catch { /* storage unavailable */ }
      router.push(`/${locale}/diagnostics/orders/${encodeURIComponent(orderId)}`);
      router.refresh();
    } catch {
      setError(ar ? "تعذر إنشاء الطلب" : "Could not create order");
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
        <>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{ar ? "شركة التأمين" : "Insurance company"}</span>
            <input value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} maxLength={128} required />
          </label>
          <p>
            <small>
              {ar ? "لديك حجز قائم؟ " : "Have an existing booking? "}
              <Link href={`/${locale}/diagnostics/bookings`}>{ar ? "ارفع مستند التأمين من حجوزاتك" : "Upload insurance documents from your bookings"}</Link>
            </small>
          </p>
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (ar ? "جارٍ الحجز..." : "Booking...") : (ar ? "تأكيد الحجز" : "Confirm booking")}</button>
    </form>
  );
}
