"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components-next/ui-generated/components/Button";
import { dayStrip } from "@/lib/consult/day-strip";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

type Slot = { start: string; available?: boolean };
type Labels = { title: string; date: string; slots: string; reason: string; submit: string; cancel: string; conflict: string; failed: string; unavailable: string; invalid: string; today: string; loading: string; noSlots: string; slotsUnavailable: string };

/** Reschedule: the new time is one of the doctor's own open slots on one of the next 7 days (as the app), never a free time. */
export function AppointmentRescheduleForm({ appointmentId, doctorId, serviceType, locale, labels }: { appointmentId: string; doctorId: string; serviceType: "video" | "clinic" | "home"; locale: string; labels: Labels }) {
  const router = useRouter();
  const days = useMemo(() => dayStrip(7), []);
  const [open, setOpen] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsFailed, setSlotsFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef<string | null>(null);
  const weekday = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short" }), [locale]);
  const monthName = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short" }), [locale]);
  const dayNumber = useMemo(() => new Intl.NumberFormat(locale, { useGrouping: false }), [locale]);
  const timeFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }), [locale]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setSelected(null); setSlotsFailed(false);
    fetch(`/api/consultations/doctors/${encodeURIComponent(doctorId)}/slots?date=${days[dayIndex].iso}&service_type=${serviceType}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("slots_unavailable"))))
      .then((data: { slots?: Slot[] }) => setSlots(Array.isArray(data.slots) ? data.slots.filter((s) => s.available !== false) : []))
      .catch(() => { if (!controller.signal.aborted) { setSlots([]); setSlotsFailed(true); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, dayIndex, days, doctorId, serviceType]);

  function start() { key.current = crypto.randomUUID(); setOpen(true); setError(null); }
  async function submit() {
    if (busy) return;
    if (!selected) { setError(labels.invalid); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "idempotency-key": key.current || crypto.randomUUID() },
        body: JSON.stringify({ scheduled_at: new Date(selected).toISOString(), ...(reason.trim() ? { reason: reason.trim() } : {}) }),
      });
      if (!response.ok) { setError(response.status === 409 ? labels.conflict : labels.failed); return; }
      setOpen(false);
      router.push(`/${locale}/appointments/${appointmentId}`);
    } catch { setError(labels.unavailable); } finally { setBusy(false); }
  }
  return (
    <section className={rx.card} aria-labelledby="reschedule-title">
      <h2 id="reschedule-title" className={styles.sectionTitle}>{labels.title}</h2>
      {!open ? (
        <Button variant="outline" fullWidth label={labels.submit} onClick={start} />
      ) : (
        <div className={styles.stack}>
          <div className={styles.days} role="group" aria-label={labels.date}>
            {days.map((day, index) => (
              <button key={day.iso} type="button" className={`${styles.choice} ${styles.day}`} aria-pressed={index === dayIndex} onClick={() => setDayIndex(index)}>
                <span className={styles.dayMeta}>{index === 0 ? labels.today : weekday.format(day.date)}</span>
                <span className={styles.dayNum}>{dayNumber.format(day.date.getDate())}</span>
                <span className={styles.dayMeta}>{monthName.format(day.date)}</span>
              </button>
            ))}
          </div>
          {loading ? <p className={`${styles.body} ${styles.muted}`} role="status">{labels.loading}</p> : slots.length === 0 ? (
            <p className={`${styles.body} ${styles.muted}`}>{slotsFailed ? labels.slotsUnavailable : labels.noSlots}</p>
          ) : (
            <div className={styles.slots} role="group" aria-label={labels.slots}>
              {slots.map((slot) => (
                <button key={slot.start} type="button" className={styles.choice} aria-pressed={slot.start === selected} onClick={() => setSelected(slot.start)}>{timeFormat.format(new Date(slot.start))}</button>
              ))}
            </div>
          )}
          <label className={styles.field}>
            <span className={styles.label}>{labels.reason}</span>
            <textarea className={styles.control} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.actionsRow}>
            <Button variant="outline" label={labels.cancel} disabled={busy} onClick={() => setOpen(false)} />
            <Button label={labels.submit} loading={busy} disabled={!selected} onClick={() => void submit()} />
          </div>
        </div>
      )}
    </section>
  );
}
