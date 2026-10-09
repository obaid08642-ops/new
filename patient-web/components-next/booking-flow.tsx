"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { specialtyLabel } from "@/lib/specialties";
import type { ReactNode } from "react";
import { doctorDisplayName, type DoctorRow } from "@/lib/api/doctors";
import type { Locale } from "@/lib/i18n";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Input } from "@/components-next/ui-generated/components/Inputs";
import { Segmented } from "@/components-next/ui-generated/components/Controls";
import { StickyFooter } from "@/components-next/ui-generated/shells/StickyFooter";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Hero, SectionCard } from "@/components-next/consult/consult-parts";
import { formatPrice } from "@/lib/format-price";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

const VISIT_TYPES = ["clinic", "video", "home"] as const;
type VisitType = (typeof VISIT_TYPES)[number];

function nextDays(count: number, locale: string): Array<{ iso: string; label: string; dateNum: string; month: string }> {
  const out: Array<{ iso: string; label: string; dateNum: string; month: string }> = [];
  const today = new Date();
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short" });
  const dayFmt = new Intl.NumberFormat(locale, { useGrouping: false });
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    // the calendar date the patient sees (not the UTC date of local midnight, which is the day before east of Greenwich)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({
      iso,
      label: i === 0 ? "today" : weekday.format(d),
      dateNum: dayFmt.format(d.getDate()),
      month: monthFmt.format(d),
    });
  }
  return out;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function BookingFlow({ doctorId, locale, doctor, top }: { doctorId: string; locale: string; doctor: DoctorRow | null; top?: ReactNode }) {
  const t = useTranslations("BookConsultation");
  const names = useTranslations("SpecialtyNames");
  const specialty = specialtyLabel(names, doctor?.specialty);
  const router = useRouter();
  const days = useMemo(() => nextDays(7, locale), [locale]);
  // Only the visit types this doctor offers (consultation_modes → clinic / online / home) (needs-review issue 1037).
  const offered = useMemo<VisitType[]>(() => {
    if (!doctor) return [...VISIT_TYPES];
    const modes = VISIT_TYPES.filter((type) => (type === "clinic" ? doctor.clinic : type === "video" ? doctor.online : doctor.home));
    return modes.length ? modes : [...VISIT_TYPES];
  }, [doctor]);
  const [visitType, setVisitType] = useState<VisitType>(offered[0]);
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
        // Insurance continues to the insurance request page with the server-issued
        // request id (mirrors mobile); card/cash land on the appointment page.
        if (paymentMethod === "insurance" && data?.insurance_request_id) {
          router.push(`/${locale}/insurance/requests/${encodeURIComponent(data.insurance_request_id)}`);
          return;
        }
        router.push(`/${locale}/appointments/${data?.id || ""}`);
        return;
      }
      const data = await res.json().catch(() => null);
      // Never show the server's raw message (English/codes) to the patient (needs-review issue 1039).
      setError(String(data?.message ?? "").includes("slot_taken") ? t("slotTaken") : "booking_failed");
    } catch {
      setError("booking_failed");
    } finally {
      setSubmitting(false);
    }
  }

  const price = doctor?.price != null ? formatPrice(locale, doctor.price) : null;
  const submitButton = (
    <Button fullWidth size="lg" label={submitting ? t("submitting") : t("submit")} loading={submitting} disabled={!selectedSlot} onClick={() => void submit()} />
  );

  return (
    <ConsultPage
      locale={locale as Locale}
      title={t("title")}
      backHref={`/${locale}/consultations/doctors/${encodeURIComponent(doctorId)}`}
      hideTabs
      footer={<StickyFooter label={t("title")}><div className={styles.bookBar}>{submitButton}</div></StickyFooter>}
    >
      {top}
      <Hero title={(doctor ? doctorDisplayName(doctor, locale) : undefined) || t("doctorUnavailable")} sub={[specialty, doctor?.facility].filter(Boolean).join(" · ") || undefined} />
      <SectionCard id="book-visit-type" title={t("visitType")}>
        <Segmented
          label={t("visitType")}
          value={visitType}
          onChange={(value) => pickVisitType(value === "video" ? "video" : value === "home" ? "home" : "clinic")}
          options={offered.map((type) => ({ value: type, label: t(`types.${type}`) }))}
        />
      </SectionCard>
      <SectionCard id="book-day" title={t("selectDay")}>
        <div className={styles.days} role="group" aria-label={t("selectDay")}>
          {days.map((day, index) => (
            <button key={day.iso} type="button" className={`${styles.choice} ${styles.day}`} aria-pressed={index === dayIndex} onClick={() => setDayIndex(index)}>
              <span className={styles.dayMeta}>{index === 0 ? t("today") : day.label}</span>
              <span className={styles.dayNum}>{day.dateNum}</span>
              <span className={styles.dayMeta}>{day.month}</span>
            </button>
          ))}
        </div>
      </SectionCard>
      <SectionCard id="book-slots" title={t("slotsLabel")}>
        {loading ? <p className={`${styles.body} ${styles.muted}`} role="status">{t("loadingSlots")}</p> : slots.length === 0 ? (
          <p className={`${styles.body} ${styles.muted}`}>{slotsReason && slotsReason !== "load_failed" ? t("noSlots") : t("slotsUnavailable")}</p>
        ) : (
          <div className={styles.slots} role="group" aria-label={t("slotsLabel")}>
            {slots.map((slot) => (
              <button key={slot.start} type="button" className={styles.choice} aria-pressed={slot.start === selectedSlot} onClick={() => setSelectedSlot(slot.start)}>
                {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(slot.start))}
              </button>
            ))}
          </div>
        )}
      </SectionCard>
      {visitType === "home" ? (
        <SectionCard id="book-home" title={t("homeLocation")}>
          <Input label={t("homeAddress")} placeholder={t("homeAddressPlaceholder")} value={homeAddress} onChange={(value) => setHomeAddress(value.slice(0, 500))} multiline rows={2} />
          <div className={styles.two}>
            <Input label={t("homeLat")} value={homeLat} onChange={setHomeLat} keyboardType="decimal" />
            <Input label={t("homeLng")} value={homeLng} onChange={setHomeLng} keyboardType="decimal" />
          </div>
        </SectionCard>
      ) : null}
      <SectionCard id="book-notes" title={t("notes")}>
        <Input value={notes} onChange={(value) => setNotes(value.slice(0, 2000))} multiline rows={3} placeholder={t("notesPlaceholder")} />
      </SectionCard>
      <SectionCard id="book-payment" title={t("payment")}>
        <Segmented
          label={t("payment")}
          value={paymentMethod}
          onChange={(value) => setPaymentMethod(value === "cash" ? "cash" : value === "insurance" ? "insurance" : "card")}
          options={allowedMethods.map((method) => ({ value: method, label: t(`pay.${method}`) }))}
        />
        {visitType !== "clinic" ? <p className={`${styles.body} ${styles.muted}`}>{t("cashClinicOnly")}</p> : null}
      </SectionCard>
      {price ? (
        <section className={`${rx.card} ${styles.priceCard}`} aria-label={t("fee")}>
          <div className={styles.totalRow}><span>{t("fee")}</span><span>{price.text}</span></div>
        </section>
      ) : null}
      {error ? <p className={styles.error} role="alert">{error === "booking_failed" ? t("bookingFailed") : error}</p> : null}
    </ConsultPage>
  );
}
