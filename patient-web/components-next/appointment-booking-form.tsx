"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Input } from "@/components-next/ui-generated/components/Inputs";
import { Segmented } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { formatWhen } from "@/components-next/pharmacy-offers/format";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

type Slot = { start: string; label?: string; available: boolean };
type PaymentMethod = "cash" | "card" | "insurance";

export function AppointmentBookingForm({
  locale,
  doctorId,
  serviceType,
  slots,
}: {
  locale: Locale;
  doctorId: string;
  serviceType: "video" | "clinic" | "home";
  slots: Slot[];
}) {
  const router = useRouter();
  const t = useTranslations("Doctors");
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{ id: string; slot: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const idempotency = useRef<string | null>(null);

  const allowedMethods: PaymentMethod[] =
    serviceType === "clinic" ? ["cash", "card", "insurance"] : serviceType === "home" ? ["card", "insurance"] : ["card"];

  function choose(start: string) {
    setSelected(start);
    idempotency.current = crypto.randomUUID();
    setMessage(null);
  }

  async function submit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/appointments/book", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotency.current || crypto.randomUUID(),
        },
        body: JSON.stringify({
          doctor_id: doctorId,
          service_type: serviceType,
          slot_start: selected,
          payment_method: paymentMethod,
          patient_name: patientName,
          patient_phone: patientPhone,
          ...(notes.trim() ? { patient_notes: notes.trim() } : {}),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.id) {
        setConfirmedBooking({ id: payload.id, slot: selected });
        return;
      }
      if (response.status === 401) {
        router.push(`/${locale}/login`);
        return;
      }
      const serverMessage =
        typeof payload?.message === "string" && payload.message
          ? payload.message
          : t("bookingFailed");
      setMessage(serverMessage);
    } catch {
      setMessage(t("connectionFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedBooking) {
    return (
      <section className={`${rx.card} ${styles.profile}`} role="status">
        <FIcon icon="check-circle" tone="mint" size={64} />
        <h3 className={styles.heroTitle}>{t("confirmedTitle")}</h3>
        <p className={`${styles.body} ${styles.muted}`}>{t("confirmedBody", { slot: formatWhen(locale, confirmedBooking.slot) ?? "" })}</p>
        <Button
          variant="outline"
          label={t("bookAnother")}
          onClick={() => {
            setConfirmedBooking(null);
            setSelected(null);
          }}
        />
      </section>
    );
  }

  // Only real slots from the doctor's schedule: the old fallback showed six invented "available" times
  // when the doctor had none (and none of them could be booked).
  const available = slots.filter((slot) => slot.available);

  return (
    <div className={styles.stack} aria-labelledby="booking-title" role="group">
      <h3 id="booking-title" className={styles.sectionTitle}>{t("bookingTitle")}</h3>
      <p className={`${styles.body} ${styles.muted}`}>{t("lockNotice")}</p>
      <div className={styles.slots}>
        {available.map((slot) => (
          <button
            type="button"
            key={slot.start}
            className={styles.choice}
            aria-pressed={slot.start === selected}
            onClick={() => choose(slot.start)}
            disabled={submitting}
          >
            {slot.label || slot.start}
          </button>
        ))}
      </div>
      {available.length === 0 ? (
        <p className={`${styles.body} ${styles.muted}`}>{t("slotsEmpty")}</p>
      ) : (
        <>
          <Input label={t("patientName")} placeholder={t("patientNamePh")} value={patientName} onChange={setPatientName} autoComplete="name" />
          <Input label={t("patientPhone")} value={patientPhone} onChange={setPatientPhone} keyboardType="phone" autoComplete="tel" />
          <Input label={t("bookingNotes")} value={notes} onChange={(value) => setNotes(value.slice(0, 2000))} multiline rows={3} />
          <Segmented
            label={t("payMethodLabel")}
            size="sm"
            value={paymentMethod}
            onChange={(value) => setPaymentMethod(value === "cash" ? "cash" : value === "insurance" ? "insurance" : "card")}
            options={allowedMethods.map((method) => ({ value: method, label: t(method === "cash" ? "payCash" : method === "insurance" ? "payInsurance" : "payCard") }))}
          />
          {paymentMethod === "insurance" ? (
            <p className={`${styles.body} ${styles.muted}`}>{t("payInsuranceNote")}</p>
          ) : paymentMethod === "card" ? (
            <p className={`${styles.body} ${styles.muted}`}>{t("payCardNote")}</p>
          ) : null}
          {message ? <p className={styles.error} role="alert">{message}</p> : null}
          <Button fullWidth label={submitting ? t("bookingSubmitting") : t("confirmBooking")} loading={submitting} disabled={!selected} onClick={() => void submit()} />
        </>
      )}
    </div>
  );
}
