# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/appointment-booking-form.tsx`
- **Member SHA-256:** `a34e013394473a17b9cd741c9c9ebe1fe1475825cbfe2ebf6ecd4bd46e79f1d3`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { useRouter } from "next/navigation";`
- `8: import styles from "./appointment-booking-form.module.css";`
- `11: export function AppointmentBookingForm({ locale, doctorId, serviceType, slots }: { locale: Locale; doctorId: string; serviceType: "video" | "clinic" | "home"; slots: Slot[] }) {`
- `12: const router = useRouter(); const t = useTranslations("Doctors");`
- `13: const [selected, setSelected] = useState<string | null>(null); const [notes, setNotes] = useState(""); const [message, setMessage] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);`
- `16: async function submit() {`
- `17: if (!selected || submitting) return;`
- `18: setSubmitting(true); setMessage(null);`
- `20: const response = await fetch("/api/appointments/book", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotency.current || crypto.randomUUID() }, body: JSON.stringify({ doctor_id: doctorId, type: servi`
- `22: if (!response.ok) { setMessage(response.status === 401 ? t("bookingAuthRequired") : response.status === 409 ? t("slotTaken") : t("bookingFailed")); return; }`
- `23: if (payload.booking_id) { router.replace(`/${locale}/appointments/${payload.booking_id}`); router.refresh(); return; }`
- `24: setMessage(t("bookingFailed"));`
### backend_consumers_or_contracts
- `20: const response = await fetch("/api/appointments/book", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotency.current || crypto.randomUUID() }, body: JSON.stringify({ doctor_id: doctorId, type: servi`
- `23: if (payload.booking_id) { router.replace(`/${locale}/appointments/${payload.booking_id}`); router.refresh(); return; }`
### auth_ownership
- `23: if (payload.booking_id) { router.replace(`/${locale}/appointments/${payload.booking_id}`); router.refresh(); return; }`
- `28: return <section className={styles.panel} aria-labelledby="booking-title"><div className={styles.heading}><div><p className={styles.eyebrow}><CalendarCheck size={15} aria-hidden="true" />{t("bookingEyebrow")}</p><h2 id="booking-title">{t("bo`
### state_transitions
- `3: import { useRef, useState } from "react";`
- `13: const [selected, setSelected] = useState<string | null>(null); const [notes, setNotes] = useState(""); const [message, setMessage] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);`
- `22: if (!response.ok) { setMessage(response.status === 401 ? t("bookingAuthRequired") : response.status === 409 ? t("slotTaken") : t("bookingFailed")); return; }`
- `24: setMessage(t("bookingFailed"));`
- `28: return <section className={styles.panel} aria-labelledby="booking-title"><div className={styles.heading}><div><p className={styles.eyebrow}><CalendarCheck size={15} aria-hidden="true" />{t("bookingEyebrow")}</p><h2 id="booking-title">{t("bo`
### payment_insurance_relevance
- `21: const payload = await response.json().catch(() => ({}));`
- `23: if (payload.booking_id) { router.replace(`/${locale}/appointments/${payload.booking_id}`); router.refresh(); return; }`
### error_empty_loading_retry_cancel
- `21: const payload = await response.json().catch(() => ({}));`
- `22: if (!response.ok) { setMessage(response.status === 401 ? t("bookingAuthRequired") : response.status === 409 ? t("slotTaken") : t("bookingFailed")); return; }`
- `24: setMessage(t("bookingFailed"));`
- `25: } catch { setMessage(t("bookingUnavailable")); } finally { setSubmitting(false); }`
- `28: return <section className={styles.panel} aria-labelledby="booking-title"><div className={styles.heading}><div><p className={styles.eyebrow}><CalendarCheck size={15} aria-hidden="true" />{t("bookingEyebrow")}</p><h2 id="booking-title">{t("bo`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
