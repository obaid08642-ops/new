"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, LoaderCircle } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { useTranslations } from "next-intl";
import styles from "./appointment-booking-form.module.css";

type Slot = { start: string; label?: string; available: boolean };
export function AppointmentBookingForm({ locale, doctorId, serviceType, slots }: { locale: Locale; doctorId: string; serviceType: "video" | "clinic" | "home"; slots: Slot[] }) {
  const router = useRouter(); const t = useTranslations("Doctors");
  const [selected, setSelected] = useState<string | null>(null); const [notes, setNotes] = useState(""); const [message, setMessage] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);
  // PH-SERVICE (D): CASH pays now via hosted checkout; INSURANCE books without
  // payment and lands on the coverage-request status page (co-pay comes later).
  const [coverage, setCoverage] = useState<"CASH" | "INSURANCE">("CASH");
  const idempotency = useRef<string | null>(null);
  function choose(start: string) { setSelected(start); idempotency.current = crypto.randomUUID(); setMessage(null); }
  async function submit() {
    if (!selected || submitting) return;
    setSubmitting(true); setMessage(null);
    try {
      const response = await fetch("/api/appointments/book", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotency.current || crypto.randomUUID() }, body: JSON.stringify({ doctor_id: doctorId, type: serviceType, slot_id: selected, ...(notes.trim() ? { notes: notes.trim() } : {}), ...(coverage === "INSURANCE" ? { coverage } : {}) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(response.status === 401 ? t("bookingAuthRequired") : response.status === 409 ? t("slotTaken") : t("bookingFailed")); return; }
      if (payload.status === "REQUEST_SUBMITTED" && payload.booking_id) {
        if (payload.insurance_request_id) { router.replace(`/${locale}/insurance/requests/${payload.insurance_request_id}`); return; }
        setMessage(payload.insurance_error || t("bookingFailed"));
        return;
      }
      if (payload.booking_id) { router.replace(`/${locale}/appointments/${payload.booking_id}`); router.refresh(); return; }
      setMessage(t("bookingFailed"));
    } catch { setMessage(t("bookingUnavailable")); } finally { setSubmitting(false); }
  }
  const available = slots.filter((slot) => slot.available);
  return <section className={styles.panel} aria-labelledby="booking-title"><div className={styles.heading}><div><p className={styles.eyebrow}><CalendarCheck size={15} aria-hidden="true" />{t("bookingEyebrow")}</p><h2 id="booking-title">{t("bookingTitle")}</h2></div><span className={styles.badge}>{t("lockNotice")}</span></div><div className={styles.slotGrid}>{available.map((slot) => <button type="button" key={slot.start} className={slot.start === selected ? styles.slotSelected : styles.slot} onClick={() => choose(slot.start)} disabled={submitting}>{slot.label || slot.start}</button>)}</div>{available.length === 0 ? <p className={styles.muted}>{t("slotsEmpty")}</p> : <><label className={styles.notes}><span>{t("bookingNotes")}</span><textarea value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} /></label><fieldset style={{ marginTop: 12, border: "none", padding: 0 }}><legend style={{ fontWeight: 600, marginBottom: 4 }}>طريقة التغطية</legend><label style={{ display: "block" }}><input type="radio" name="coverage" value="CASH" checked={coverage === "CASH"} onChange={() => setCoverage("CASH")} disabled={submitting} /> نقدي / بطاقة — أدفع الآن لتأكيد الموعد</label><label style={{ display: "block" }}><input type="radio" name="coverage" value="INSURANCE" checked={coverage === "INSURANCE"} onChange={() => setCoverage("INSURANCE")} disabled={submitting} /> تأمين — إرسال الطلب بدون دفع، وأدفع تحمّلي بعد الموافقة</label></fieldset>{message ? <p className={styles.error} role="alert">{message}</p> : null}<button type="button" className={styles.submit} disabled={!selected || submitting} onClick={submit}>{submitting ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : <CalendarCheck size={18} aria-hidden="true" />}{submitting ? t("bookingSubmitting") : coverage === "INSURANCE" ? "إرسال طلب التأمين" : t("confirmBooking")}</button></>}</section>;
}
