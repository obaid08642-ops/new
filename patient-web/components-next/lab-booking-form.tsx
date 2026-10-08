"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import consult from "@/components-next/consult/consult.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/diagnostics/diag.module.css";

/** The booking of one lab test (canvas/BookingConfirm): where, when, how to pay, then the booking. The request, its idempotency key and the checks are unchanged; this is its markup and texts. */
export function LabBookingForm({ locale, serviceId, providerId, serviceName, homeEligible }: { locale: string; serviceId: string; providerId: string; serviceName: string; homeEligible: boolean }) {
  const t = useTranslations("DiagWeb");
  const router = useRouter();
  const [locationType, setLocationType] = useState<"facility" | "home">("facility");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "insurance">("card");
  const [scheduledAt, setScheduledAt] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const key = useRef<string | null>(null);
  async function submit() {
    if (!scheduledAt || state === "loading") { setError(t("errPickTime")); return; }
    if (locationType === "home" && paymentMethod === "insurance" && !documentUrl.trim()) { setError(t("errHomeInsuranceDoc")); return; }
    key.current ??= crypto.randomUUID(); setState("loading"); setError("");
    const documents = documentUrl.trim() ? [{ kind: "doctor_request", url_or_b64: documentUrl.trim() }] : [];
    try {
      const r = await fetch("/api/patient/labs/bookings", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key.current }, body: JSON.stringify({ items: [{ service_id: serviceId }], provider_account_id: providerId, scheduled_at: new Date(scheduledAt).toISOString(), location_type: locationType, payment_method: paymentMethod, documents }) });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.id) throw new Error(data?.message || "booking_failed");
      router.push(`/${locale}/diagnostics/labs/${data.id}`);
    } catch (e: unknown) { setState("error"); setError(e instanceof Error && e.message === "slot_taken" ? t("errSlotTaken") : t("errBooking")); }
  }
  return (
    <div className={consult.stack}>
      <section className={rx.card} aria-labelledby="book-service">
        <h2 id="book-service" className={consult.sectionTitle}>{serviceName}</h2>
      </section>

      <section className={rx.card} aria-labelledby="book-where">
        <h2 id="book-where" className={consult.sectionTitle}>{t("bookWhere")}</h2>
        <div className={consult.choices} role="group" aria-label={t("bookWhere")}>
          <button type="button" className={consult.choice} aria-pressed={locationType === "facility"} onClick={() => setLocationType("facility")}>{t("placeLab")}</button>
          <button type="button" className={consult.choice} aria-pressed={locationType === "home"} disabled={!homeEligible} onClick={() => setLocationType("home")}>{t("placeHomeLab")}</button>
        </div>
        {!homeEligible ? <p className={styles.flowNote}>{t("bookHomeUnavailable")}</p> : null}
        <label className={consult.field}>
          <span className={consult.label}>{t("bookWhen")}</span>
          <input className={consult.control} type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
        </label>
      </section>

      <section className={rx.card} aria-labelledby="book-pay">
        <h2 id="book-pay" className={consult.sectionTitle}>{t("checkoutPay")}</h2>
        <div className={consult.choices} role="group" aria-label={t("checkoutPay")}>
          <button type="button" className={consult.choice} aria-pressed={paymentMethod === "card"} onClick={() => setPaymentMethod("card")}>{t("payCard")}</button>
          <button type="button" className={consult.choice} aria-pressed={paymentMethod === "cash"} disabled={locationType === "home"} onClick={() => setPaymentMethod("cash")}>{t("payCash")}</button>
          <button type="button" className={consult.choice} aria-pressed={paymentMethod === "insurance"} onClick={() => setPaymentMethod("insurance")}>{t("payInsurance")}</button>
        </div>
        {paymentMethod === "insurance" ? (
          <label className={consult.field}>
            <span className={consult.label}>{t("bookDocLabel")}</span>
            <input className={consult.control} value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} inputMode="url" dir="ltr" />
          </label>
        ) : null}
      </section>

      {error ? <p className={consult.error} role="alert">{error}</p> : null}
      <Button label={state === "loading" ? t("bookSaving") : t("bookConfirm")} size="lg" fullWidth loading={state === "loading"} disabled={state === "loading"} onClick={submit} />
    </div>
  );
}
