"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { DoctorRow } from "@/lib/api/doctors";
import styles from "./booking-flow.module.css";

const VISIT_TYPES = ["clinic", "video", "home"] as const;
type VisitType = (typeof VISIT_TYPES)[number];

function nextDays(count: number): Array<{ iso: string; label: string; dateNum: string; month: string }> {
  const out: Array<{ iso: string; label: string; dateNum: string; month: string }> = [];
  const today = new Date();
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short" });
  const monthFmt = new Intl.DateTimeFormat("en", { month: "short" });
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: i === 0 ? "today" : weekday.format(d),
      dateNum: String(d.getDate()),
      month: monthFmt.format(d),
    });
  }
  return out;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function BookingFlow({ doctorId, locale, doctor }: { doctorId: string; locale: string; doctor: DoctorRow | null }) {
  const t = useTranslations("BookConsultation");
  const router = useRouter();
  const days = useMemo(() => nextDays(7), []);
  const [visitType, setVisitType] = useState<VisitType>("clinic");
  const [dayIndex, setDayIndex] = useState(0);
  const [slots, setSlots] = useState<Array<{ start: string; end: string; label: string; available: boolean }>>([]);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "insurance">("card");
  const [homeLat, setHomeLat] = useState("");
  const [homeLng, setHomeLng] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const allowedMethods = visitType === "clinic" ? (["cash", "card", "insurance"] as const) : (["card", "insurance"] as const);

  function pickVisitType(v: VisitType) {
    setVisitType(v);
    // Server policy (mirrors mobile): cash is clinic-only. Never offer a
    // combination the backend rejects with payment_method_not_allowed.
    if (v !== "clinic" && paymentMethod === "cash") setPaymentMethod("card");
    setSelectedSlot(null);
  }

  useEffect(() => {
    setLoading(true);
    setSelectedSlot(null);
    setSlotsReason(null);
    const controller = new AbortController();
    const date = days[dayIndex]?.iso;
    if (!date) { setLoading(false); return; }
    fetch(`/api/consultations/doctors/${encodeURIComponent(doctorId)}/slots?date=${date}&service_type=${visitType}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("slots_unavailable"))))
      .then((data) => {
        setSlots(Array.isArray(data.slots) ? data.slots.filter((s: { available?: boolean }) => s.available !== false) : []);
        setSlotsReason(typeof data.reason === "string" ? data.reason : null);
      })
      .catch((err) => { if (!controller.signal.aborted) { setSlots([]); setSlotsReason("load_failed"); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [doctorId, visitType, dayIndex, days]);

  async function submit() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      // Home visits require a location for the doctor to travel to.
      let visitLocation: { lat: number; lng: number; address: string } | undefined;
      if (visitType === "home") {
        const lat = Number(homeLat);
        const lng = Number(homeLng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !homeAddress.trim()) {
          setError(t("homeAddressRequired"));
          return;
        }
        visitLocation = { lat, lng, address: homeAddress.trim() };
      }
      // Hold the slot first (10-min TTL): the server consumes the lock on
      // booking success and releases it on failure, so double-submits and a
      // second device can never double-book (P3-e, web adoption).
      let slotLockId: string | undefined;
      try {
        const lockRes = await fetch("/api/slot-locks/reserve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider_id: doctorId, slot_start: selectedSlot }),
        });
        const lockData = await lockRes.json().catch(() => null);
        if (!lockRes.ok) throw new Error(typeof lockData?.message === "string" ? lockData.message : "slot_hold_failed");
        slotLockId = lockData?.id;
      } catch (lockErr: any) {
        const code = String(lockErr?.message || "");
        setError(code.includes("slot_taken") ? t("slotTaken") : "booking_failed");
        return;
      }
      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        body: JSON.stringify({
          doctor_id: doctorId,
          service_type: visitType,
          slot_start: selectedSlot,
          payment_method: paymentMethod,
          patient_notes: notes.trim() || undefined,
          visit_location: visitLocation,
          slot_lock_id: slotLockId,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        // Insurance continues to the payment-split flow with the server-issued
        // request id (mirrors mobile); card/cash land on the appointment page.
        if (paymentMethod === "insurance" && data?.insurance_request_id) {
          router.push(`/${locale}/insurance/payment-split?request_id=${encodeURIComponent(data.insurance_request_id)}`);
          return;
        }
        router.push(`/${locale}/appointments/${data?.id || ""}`);
        return;
      }
      const data = await res.json().catch(() => null);
      setError(typeof data?.message === "string" ? data.message : "booking_failed");
    } catch {
      setError("booking_failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.flow} aria-label={t("title")}>
      {doctor ? (
        <p className={styles.meta}>{doctor.specialty ? `${doctor.specialty} · ` : ""}{doctor.price != null ? `${doctor.price} ${t("currency")}` : ""}</p>
      ) : null}
      <fieldset className={styles.group}>
        <legend>{t("visitType")}</legend>
        <div className={styles.types}>
          {VISIT_TYPES.map((type) => (
            <button key={type} type="button" className={type === visitType ? `${styles.typeBtn} ${styles.active}` : styles.typeBtn} onClick={() => pickVisitType(type)}>
              {t(`types.${type}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{t("selectDay")}</legend>
        <div className={styles.days}>
          {days.map((day, index) => (
            <button key={day.iso} type="button" className={index === dayIndex ? `${styles.day} ${styles.active}` : styles.day} onClick={() => setDayIndex(index)}>
              <span className={styles.dayLabel}>{index === 0 ? t("today") : day.label}</span>
              <span className={styles.dayNum}>{day.dateNum}</span>
              <span className={styles.dayMonth}>{day.month}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{t("slotsLabel")}</legend>
        {loading ? <p className={styles.empty}>{t("loadingSlots")}</p> : slots.length === 0 ? (
          <p className={styles.empty}>{slotsReason && slotsReason !== "load_failed" ? t("noSlots") : t("slotsUnavailable")}</p>
        ) : (
          <div className={styles.slots}>
            {slots.map((slot) => (
              <button key={slot.start} type="button" className={slot.start === selectedSlot ? `${styles.slot} ${styles.active}` : styles.slot}
                onClick={() => setSelectedSlot(slot.start)}>
                {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(slot.start))}
              </button>
            ))}
          </div>
        )}
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{t("payment")}</legend>
        <div className={styles.types}>
          {allowedMethods.map((method) => (
            <button key={method} type="button" className={paymentMethod === method ? `${styles.typeBtn} ${styles.active}` : styles.typeBtn} onClick={() => setPaymentMethod(method)}>
              {t(`pay.${method}`)}
            </button>
          ))}
        </div>
        {visitType !== "clinic" && (
          <p className={styles.empty}>{t("cashClinicOnly")}</p>
        )}
      </fieldset>
      {visitType === "home" && (
        <fieldset className={styles.group}>
          <legend>{t("homeLocation")}</legend>
          <label className={styles.notes}>
            {t("homeAddress")}
            <textarea value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} maxLength={500} rows={2} placeholder={t("homeAddressPlaceholder")} />
          </label>
          <div className={styles.types}>
            <label className={styles.notes}>
              {t("homeLat")}
              <input value={homeLat} onChange={(e) => setHomeLat(e.target.value)} inputMode="decimal" placeholder="24.7136" />
            </label>
            <label className={styles.notes}>
              {t("homeLng")}
              <input value={homeLng} onChange={(e) => setHomeLng(e.target.value)} inputMode="decimal" placeholder="46.6753" />
            </label>
          </div>
        </fieldset>
      )}
      <label className={styles.notes}>
        {t("notes")}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} placeholder={t("notesPlaceholder")} />
      </label>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button type="button" className={styles.submit} disabled={!selectedSlot || submitting} onClick={() => void submit()}>
        {submitting ? t("submitting") : t("submit")}
      </button>
    </section>
  );
}
