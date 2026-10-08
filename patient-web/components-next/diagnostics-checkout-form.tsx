"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import consult from "@/components-next/consult/consult.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/diagnostics/diag.module.css";

const TIMES = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];

/** The checkout of the tests order (canvas/CheckoutV2): the day and time, the payment method, the address for a home sample, then the order and, for a card, the payment. The flow is unchanged; this is its markup and texts. */
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
  const t = useTranslations("DiagWeb");
  const router = useRouter();
  const days = useMemo(() => {
    const out: Array<{ iso: string; weekday: string; date: string }> = [];
    // Gregorian by default; Hijri automatically when the device uses it.
    let calendar = "gregory";
    try {
      const deviceCal = Intl.DateTimeFormat().resolvedOptions().calendar || "";
      if (/islamic|hijri/i.test(deviceCal)) calendar = "islamic-umalqura";
    } catch {}
    const tag = `${locale}-u-ca-${calendar}`;
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      out.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        weekday: new Intl.DateTimeFormat(tag, { weekday: "short" }).format(d),
        date: new Intl.DateTimeFormat(tag, { day: "numeric", month: "short" }).format(d),
      });
    }
    return out;
  }, [locale]);
  const timeLabel = (hhmm: string) => new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(new Date(`2000-01-01T${hhmm}:00`));
  const [day, setDay] = useState(days[0]?.iso || "");
  const [time, setTime] = useState<string | null>(null);
  const [method, setMethod] = useState<"cash" | "card" | "insurance">(initialLocation === "home" ? "card" : "cash");
  const [address, setAddress] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allowedMethods = initialLocation === "home" ? ["card", "insurance"] : ["cash", "card", "insurance"];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!time) {
      setError(t("errPickTime"));
      return;
    }
    if (initialLocation === "home" && !address.trim()) {
      setError(t("errAddress"));
      return;
    }
    if (method === "insurance" && !insuranceProvider.trim()) {
      setError(t("errInsurer"));
      return;
    }
    const scheduled = new Date(`${day}T${time}:00`);
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now()) {
      setError(t("errPast"));
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
        setError((data as { message?: string })?.message || t("errOrder"));
        return;
      }
      const order = (data as { data?: { id?: string }; id?: string })?.data ?? data;
      const orderId = (order as { id?: string })?.id;
      if (!orderId) {
        setError(t("errOrder"));
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
          setError((payData as { message?: string })?.message || t("errPay"));
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
      setError(t("errOrder"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={consult.stack} noValidate>
      <section className={rx.card} aria-labelledby="co-when">
        <h2 id="co-when" className={consult.sectionTitle}>{t("checkoutWhen")}</h2>
        <div className={consult.days} role="group" aria-label={t("checkoutDay")}>
          {days.map((d) => (
            <button key={d.iso} type="button" className={`${consult.choice} ${consult.day}`} aria-pressed={day === d.iso} onClick={() => setDay(d.iso)}>
              <span className={consult.dayMeta}>{d.weekday}</span>
              <span className={consult.dayNum}>{d.date}</span>
            </button>
          ))}
        </div>
        <div className={consult.slots} role="group" aria-label={t("checkoutTime")}>
          {TIMES.map((slot) => (
            <button key={slot} type="button" className={consult.choice} aria-pressed={time === slot} onClick={() => setTime(slot)}>
              <bdi>{timeLabel(slot)}</bdi>
            </button>
          ))}
        </div>
      </section>

      <section className={rx.card} aria-labelledby="co-pay">
        <h2 id="co-pay" className={consult.sectionTitle}>{t("checkoutPay")}</h2>
        <div className={consult.choices} role="group" aria-label={t("checkoutPay")}>
          {allowedMethods.map((m) => (
            <button key={m} type="button" className={consult.choice} aria-pressed={method === m} onClick={() => setMethod(m as "cash" | "card" | "insurance")}>
              {m === "cash" ? t("payCash") : m === "card" ? t("payCard") : t("payInsurance")}
            </button>
          ))}
        </div>
        {method === "card" ? <p className={styles.flowNote}>{t("payCardNote")}</p> : null}
        {method === "insurance" ? (
          <>
            <label className={consult.field}>
              <span className={consult.label}>{t("insurerLabel")}</span>
              <input className={consult.control} value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} maxLength={128} required />
            </label>
            <p className={styles.flowNote}>
              {t("insuranceHint")}{" "}
              <Link className={rx.textLink} href={`/${locale}/diagnostics/bookings`}>{t("insuranceHintLink")}</Link>
            </p>
          </>
        ) : null}
      </section>

      {initialLocation === "home" ? (
        <section className={rx.card} aria-labelledby="co-address">
          <h2 id="co-address" className={consult.sectionTitle}>{t("addressTitle")}</h2>
          <label className={consult.field}>
            <span className="sr-only">{t("addressTitle")}</span>
            <textarea className={consult.control} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={1000} rows={3} required />
          </label>
        </section>
      ) : null}

      {error ? <p className={consult.error} role="alert">{error}</p> : null}
      <Button type="submit" label={saving ? t("checkoutSaving") : t("checkoutConfirm")} size="lg" fullWidth loading={saving} disabled={saving} />
    </form>
  );
}
