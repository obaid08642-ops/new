"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildScheduleDays, groupSlotsByDay, slotTimeLabel } from "@/lib/consult/doctor-schedule";
import { bookingHref } from "@/lib/consult/booking-params";
import { useBookingSelection } from "./doctor-booking-bar";
import styles from "./consult.module.css";
import own from "./doctor-schedule.module.css";

export type ScheduleType = "clinic" | "video" | "home";
export type ScheduleLabels = {
  daysLabel: string; timesLabel: string; typesLabel: string; today: string; tomorrow: string;
  loading: string; empty: string; noDays: string; error: string; retry: string; signIn: string; book: string;
};
type Slot = { start: string; available?: boolean };
type State = "loading" | "ready" | "error" | "signin";

/**
 * The appointments of a doctor: a day strip (weekday and date in the active locale) and, under the chosen day, the time
 * chips from the existing slots endpoint. A time chip is a radio-like choice: it sets the selection the sticky Book bar reads (the bar goes to the
 * existing booking page); visit type, day and times load with the same request the booking page makes.
 */
export function DoctorSchedule({ doctorId, locale, types, initialType, bookHref, labels }: {
  doctorId: string; locale: string; types: Array<{ value: ScheduleType; label: string }>; initialType: ScheduleType; bookHref: string; labels: ScheduleLabels;
}) {
  const days = useMemo(() => buildScheduleDays(14, locale), [locale]);
  const [type, setType] = useState<ScheduleType>(types.some((x) => x.value === initialType) ? initialType : types[0]?.value ?? initialType);
  const [dayIndex, setDayIndex] = useState(0);
  const [state, setState] = useState<State>("loading");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [attempt, setAttempt] = useState(0);
  const day = days[dayIndex];
  const { selection, setSelection } = useBookingSelection();

  useEffect(() => {
    if (types.length === 0 || !day) return;
    const controller = new AbortController();
    setState("loading");
    fetch(`/api/consultations/doctors/${encodeURIComponent(doctorId)}/slots?date=${day.iso}&service_type=${type}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 401) { setSlots([]); setState("signin"); return; }
        if (!res.ok) throw new Error("slots_unavailable");
        const data = (await res.json()) as { slots?: Slot[] };
        const list = Array.isArray(data.slots) ? data.slots.filter((s) => s.available !== false) : [];
        setSlots(groupSlotsByDay(list).get(day.iso) ?? []);
        setState("ready");
      })
      .catch(() => { if (!controller.signal.aborted) { setSlots([]); setState("error"); } });
    return () => controller.abort();
  }, [doctorId, type, day, attempt, types.length]);

  const href = bookingHref(bookHref, type, selection?.type === type ? selection.start : undefined);
  if (types.length === 0) return <p className={own.state}>{labels.noDays}</p>;
  return (
    <div className={own.schedule}>
      {types.length > 1 ? (
        <div className={own.types} role="group" aria-label={labels.typesLabel}>
          {types.map((x) => <button key={x.value} type="button" className={styles.choice} aria-pressed={x.value === type} onClick={() => { setSelection(null); setType(x.value); }}>{x.label}</button>)}
        </div>
      ) : null}
      <div className={own.days} role="group" aria-label={labels.daysLabel}>
        {days.map((d, i) => (
          <button key={d.iso} type="button" className={`${styles.choice} ${styles.day} ${own.dayBtn}`} aria-pressed={i === dayIndex} onClick={() => { setSelection(null); setDayIndex(i); }}>
            <span className={styles.dayMeta}>{d.relative === "today" ? labels.today : d.relative === "tomorrow" ? labels.tomorrow : d.weekday}</span>
            <span className={styles.dayNum}>{d.dayNumber}</span>
            <span className={styles.dayMeta}>{d.month}</span>
          </button>
        ))}
      </div>
      <div role="group" aria-label={labels.timesLabel} aria-live="polite" aria-busy={state === "loading"}>
        {state === "loading" ? (
          <div className={own.times} role="status" aria-label={labels.loading}>{[0, 1, 2, 3, 4, 5].map((n) => <span key={n} className={own.skeleton} />)}</div>
        ) : state === "ready" && slots.length > 0 ? (
          <div className={own.times} role="radiogroup" aria-label={labels.timesLabel}>
            {slots.map((s) => {
              const chosen = selection?.start === s.start && selection.type === type;
              return <button key={s.start} type="button" role="radio" aria-checked={chosen} className={`${styles.choice} ${own.timeChip}`} onClick={() => setSelection({ type, start: s.start })}>{slotTimeLabel(locale, s.start)}</button>;
            })}
          </div>
        ) : state === "ready" ? (
          <p className={own.state}>{labels.empty}</p>
        ) : state === "signin" ? (
          <>
            <p className={own.state}>{labels.signIn}</p>
            <div className={own.stateActions}><Link href={href} className={styles.choice}>{labels.book}</Link></div>
          </>
        ) : (
          <>
            <p className={own.state} role="alert">{labels.error}</p>
            <div className={own.stateActions}><button type="button" className={styles.choice} onClick={() => setAttempt((n) => n + 1)}>{labels.retry}</button></div>
          </>
        )}
      </div>
    </div>
  );
}
