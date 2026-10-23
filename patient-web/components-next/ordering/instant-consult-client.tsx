"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cancelInstant, InstantApiError, readInstant, startInstant } from "@/lib/consult/instant-client";
import { clockText, instantErrorKey, instantOpen, type Instant, type InstantMode } from "@/lib/consult/instant";
import styles from "./ordering.module.css";

export type SpecialtyChoice = { value: string; label: string };
type Props = { locale: string; specialties: SpecialtyChoice[]; bookingId: string | null; attachedCount: number };

const POLL_MS = 3000; // the backend closes the request on read; the clock itself ticks locally from seconds_left
const MODES: InstantMode[] = ["video", "audio"];
const when = (locale: string, iso: string) => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** Ord11 (canvas/Ord11-Results, "Discuss with a doctor"): choose specialty and mode, broadcast, wait, cancel, open the consultation. */
export function InstantConsultClient({ locale, specialties, bookingId, attachedCount }: Props) {
  const t = useTranslations("InstantConsult");
  const [specialty, setSpecialty] = useState(specialties[0]?.value ?? "");
  const [mode, setMode] = useState<InstantMode>("video");
  const [req, setReq] = useState<Instant | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [noDoctorsSlot, setNoDoctorsSlot] = useState<{ startsAt: string } | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!req || !instantOpen(req)) return;
    const ctl = new AbortController();
    const timer = window.setInterval(() => {
      readInstant(req.id, ctl.signal).then((a) => { if (!ctl.signal.aborted) setReq(a); }).catch(() => { /* a failed poll keeps the last answer; the next one retries */ });
    }, POLL_MS);
    return () => { ctl.abort(); window.clearInterval(timer); };
  }, [req]);

  useEffect(() => {
    if (!req) return;
    setLeft(req.secondsLeft);
    if (!instantOpen(req)) return;
    const timer = window.setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [req]);

  const run = async (job: () => Promise<Instant>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setErrorKey(null); setNoDoctorsSlot(null);
    try { setReq(await job()); }
    catch (e) {
      if (e instanceof InstantApiError) {
        setErrorKey(instantErrorKey(e.code));
        const slot = e.earliestSlot;
        if (e.code === "instant_no_online_doctors" && slot) setNoDoctorsSlot({ startsAt: slot.startsAt });
      } else setErrorKey("errGeneric");
    } finally { busyRef.current = false; setBusy(false); }
  };

  const reset = () => { setReq(null); setErrorKey(null); setNoDoctorsSlot(null); };
  const room = req?.appointmentId ? (req.mode === "audio" ? `/${locale}/appointments/${encodeURIComponent(req.appointmentId)}` : `/${locale}/consultations/video-call?appointmentId=${encodeURIComponent(req.appointmentId)}`) : null;
  const fallback = req?.fallback;

  return (
    <div className={styles.stack} aria-live="polite">
      {!req || req.status === "cancelled" ? (
        <section className={styles.card} aria-label={t("startTitle")}>
          <h2 className={styles.title}>{t("startTitle")}</h2>
          <p className={styles.sub}>{t("startBody")}</p>
          {bookingId && attachedCount > 0 ? <p className={styles.note}>{t("attached", { count: attachedCount })}</p> : null}
          {specialties.length === 0 ? (
            <p className={styles.errorBox} role="alert">{t("noSpecialties")}</p>
          ) : (
            <>
              <label className={styles.sub} htmlFor="instant-specialty">{t("specialty")}</label>
              <select id="instant-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={styles.linkBtn}>
                {specialties.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <div role="group" aria-label={t("mode")} className={styles.stack}>
                {MODES.map((m) => <button key={m} type="button" className={styles.chip} aria-pressed={mode === m} onClick={() => setMode(m)}>{t(m === "video" ? "modeVideo" : "modeAudio")}</button>)}
              </div>
              <button type="button" className={`${styles.linkBtn} ${styles.cta}`} disabled={busy || !specialty} onClick={() => run(() => startInstant({ specialty, mode }, bookingId))}>{t("start")}</button>
            </>
          )}
          {req?.status === "cancelled" ? <p className={styles.note} role="status">{t("cancelled")}</p> : null}
        </section>
      ) : null}

      {req && instantOpen(req) ? (
        <section className={styles.card} aria-label={t("waitTitle")}>
          <h2 className={styles.title}>{t("waitTitle")}</h2>
          {req.doctorsNotified !== null ? <p className={styles.sub}>{t("notified", { count: req.doctorsNotified })}</p> : null}
          <p className={styles.sub}>{t("left")}</p>
          <p className={styles.clock} role="timer"><bdi>{clockText(locale, left)}</bdi></p>
          {req.paymentStatus === "not_charged" ? <p className={styles.note}>{t("notCharged")}</p> : null}
          <button type="button" className={styles.linkBtn} disabled={busy} onClick={() => run(() => cancelInstant(req.id))}>{t("cancel")}</button>
        </section>
      ) : null}

      {req?.status === "accepted" ? (
        <section className={styles.card} aria-label={t("acceptedTitle")} role="status">
          <h2 className={styles.title}>{t("acceptedTitle")}</h2>
          <p className={styles.sub}>{t("acceptedBody")}</p>
          {room ? <Link href={room} className={`${styles.linkBtn} ${styles.cta}`}>{t("open")}</Link> : null}
        </section>
      ) : null}

      {req?.status === "expired" ? (
        <section className={styles.card} aria-label={t("expiredTitle")} role="status">
          <h2 className={styles.title}>{t("expiredTitle")}</h2>
          <p className={styles.sub}>{t("expiredBody")}</p>
          {fallback?.options.includes("earliest_slot") ? (
            fallback.earliestSlot ? <p className={styles.note}>{t("earliest", { when: when(locale, fallback.earliestSlot.startsAt) })}</p> : <p className={styles.note}>{t("earliestNone")}</p>
          ) : null}
          {fallback?.options.includes("refund") && req.paymentStatus === "not_charged" ? <p className={styles.note}>{t("notCharged")}</p> : null}
          <Link href={`/${locale}/consultations/doctors`} className={styles.linkBtn}>{t("browseDoctors")}</Link>
          <button type="button" className={`${styles.linkBtn} ${styles.cta}`} onClick={reset}>{t("again")}</button>
        </section>
      ) : null}

      {noDoctorsSlot ? <p className={styles.note} role="status">{t("earliest", { when: when(locale, noDoctorsSlot.startsAt) })}</p> : null}
      {errorKey ? <div className={styles.errorBox} role="alert">{t(errorKey)}{errorKey === "errNoDoctors" ? ` ${t("errNoDoctorsHint")}` : ""}</div> : null}
    </div>
  );
}
