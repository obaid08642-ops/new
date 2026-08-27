"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, LoaderCircle } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { useTranslations } from "next-intl";
import styles from "./appointment-booking-form.module.css";

type Slot = { start: string; label?: string; available: boolean };
type PaymentMethod = "cash" | "card" | "insurance";
export function AppointmentBookingForm({ locale, doctorId, serviceType, slots }: { locale: Locale; doctorId: string; serviceType: "video" | "clinic" | "home"; slots: Slot[] }) {
  const router = useRouter(); const t = useTranslations("Doctors");
  const [selected, setSelected] = useState<string | null>(null); const [notes, setNotes] = useState(""); const [message, setMessage] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const idempotency = useRef<string | null>(null);
  const allowedMethods: PaymentMethod[] = serviceType === "clinic" ? ["cash", "card", "insurance"] : serviceType === "home" ? ["card", "insurance"] : ["card"];
  function choose(start: string) { setSelected(start); idempotency.current = crypto.randomUUID(); setMessage(null); }
  async function submit() {
    if (!selected || submitting) return;
    setSubmitting(true); setMessage(null);
    try {
      const response = await fetch("/api/appointments/book", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotency.current || crypto.randomUUID() }, body: JSON.stringify({ doctor_id: doctorId, service_type: serviceType, slot_start: selected, payment_method: paymentMethod, ...(notes.trim() ? { patient_notes: notes.trim() } : {}) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(response.status === 401 ? t("bookingAuthRequired") : response.status === 409 ? t("slotTaken") : t("bookingFailed")); return; }
      if (payload.id) { router.replace(`/${locale}/appointments/${payload.id}`); router.refresh(); return; }
      setMessage(t("bookingFailed"));
    } catch { setMessage(t("bookingUnavailable")); } finally { setSubmitting(false); }
  }
  const available = slots.filter((slot) => slot.available);
  return <section className={styles.panel} aria-labelledby="booking-title"><div className={styles.heading}><div><p className={styles.eyebrow}><CalendarCheck size={15} aria-hidden="true" />{t("bookingEyebrow")}</p><h2 id="booking-title">{t("bookingTitle")}</h2></div><span className={styles.badge}>{t("lockNotice")}</span></div><div className={styles.slotGrid}>{available.map((slot) => <button type="button" key={slot.start} className={slot.start === selected ? styles.slotSelected : styles.slot} onClick={() => choose(slot.start)} disabled={submitting}>{slot.label || slot.start}</button>)}</div>{available.length === 0 ? <p className={styles.muted}>{t("slotsEmpty")}</p> : <><label className={styles.notes}><span>{t("bookingNotes")}</span><textarea value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} /></label><label className={styles.notes}><span>طريقة المتابعة</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>{allowedMethods.map((method) => <option key={method} value={method}>{method === "cash" ? "نقد عند العيادة" : method === "insurance" ? "تأمين" : "بطاقة إلكترونية"}</option>)}</select></label>{paymentMethod === "insurance" ? <p className={styles.muted}>سيُرسل طلب التأمين للمراجعة ولا تُنشأ عملية دفع أو تأكيد قبل القرار الخادمي.</p> : paymentMethod === "card" ? <p className={styles.muted}>لا يُعد إنشاء الموعد تأكيداً للدفع؛ تُعرض الحالة الخادمية التالية في صفحة الموعد.</p> : null}{message ? <p className={styles.error} role="alert">{message}</p> : null}<button type="button" className={styles.submit} disabled={!selected || submitting} onClick={submit}>{submitting ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : <CalendarCheck size={18} aria-hidden="true" />}{submitting ? t("bookingSubmitting") : t("confirmBooking")}</button></>}</section>;
}
