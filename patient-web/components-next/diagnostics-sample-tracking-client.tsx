"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Timeline } from "@/components-next/ui-generated/components/Cards";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { LAB } from "@/components-next/diagnostics/diag-parts";
import { BulletList } from "@/components-next/consult/consult-parts";
import { diagStatus } from "@/components-next/diagnostics/status";
import { minutesText } from "@/components-next/diagnostics/diag-parts";
import { formatWhen } from "@/components-next/pharmacy-offers/format";
import consult from "@/components-next/consult/consult.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/diagnostics/diag.module.css";

type Step = { state: string; at?: string };
type Prep = { key: string; name: string; lines: string[] };
type Tracking = { state?: string; eta?: number | null; techName?: string; techPhone?: string; home: boolean; scheduledAt?: string; steps: Step[]; preparation: Prep[] };

/** The catalogue language a test's preparation is written in, for the site locale (fil is "tl" in the catalogue). */
const PREP_LANG: Record<string, string> = { ar: "ar", en: "en", ur: "ur", hi: "hi", bn: "bn", fil: "tl" };

/**
 * GET /labs/bookings/:id/tracking (decision B8: no fixed medical text): `timeline` is the states the booking really went
 * through, `preparation` each test's own catalogue text per language. Nothing is invented when either is missing.
 */
export function parseTracking(payload: unknown, locale: string): Tracking {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const t = (root.tracking && typeof root.tracking === "object" ? root.tracking : root) as Record<string, unknown>;
  const b = (root.booking && typeof root.booking === "object" ? root.booking : null) as Record<string, unknown> | null;
  const steps: Step[] = (Array.isArray(t.timeline) ? t.timeline : []).flatMap((s) => {
    if (!s || typeof s !== "object") return [];
    const o = s as Record<string, unknown>;
    return typeof o.state === "string" && o.state ? [{ state: o.state, at: typeof o.at === "string" ? o.at : undefined }] : [];
  });
  const prepLang = PREP_LANG[locale] ?? "en";
  const preparation: Prep[] = (Array.isArray(t.preparation) ? t.preparation : []).flatMap((p, i) => {
    if (!p || typeof p !== "object") return [];
    const o = p as Record<string, unknown>;
    const texts = o.texts && typeof o.texts === "object" ? (o.texts as Record<string, unknown>)[prepLang] : null;
    const lines = Array.isArray(texts) ? texts.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
    const pick = (v: unknown) => (typeof v === "string" ? v : "");
    const name = locale === "ar" ? pick(o.name_ar) || pick(o.name_en) : pick(o.name_en) || pick(o.name_ar);
    return lines.length ? [{ key: pick(o.service_id) || String(i), name, lines }] : [];
  });
  const techName = typeof t.techName === "string" && t.techName.trim() ? t.techName : undefined;
  const techPhone = typeof t.techPhone === "string" && t.techPhone.trim() ? t.techPhone : undefined;
  return {
    state: b && typeof b.state === "string" ? b.state : undefined,
    eta: typeof t.eta === "number" ? t.eta : null,
    techName,
    techPhone,
    home: Boolean(b && (b.location_type === "HOME_COLLECTION" || b.location_type === "MOBILE_HOME_VISIT")),
    scheduledAt: b && typeof b.scheduled_at === "string" ? b.scheduled_at : undefined,
    steps,
    preparation,
  };
}

const FINAL_STATES = new Set(["REPORTED", "CANCELLED", "SAMPLE_REJECTED"]);

/** The states the booking went through, named like the status chip, each with its time; the last one is current. */
export function TrackingSteps({ steps, locale }: { steps: Step[]; locale: string }) {
  const t = useTranslations("DiagWeb");
  const last = steps.length - 1;
  return (
    <section className={rx.card} aria-labelledby="trk-steps">
      <h2 id="trk-steps" className={consult.sectionTitle}>{t("trackingStepsTitle")}</h2>
      {steps.length > 0 ? (
        <Timeline
          label={t("trackingStepsTitle")}
          steps={steps.map((step, i) => {
            const key = diagStatus(step.state).key;
            return { id: `${i}`, label: key === "unknown" ? t("trackingInProgress") : t(`status_${key}`), time: (step.at && formatWhen(locale, step.at)) || undefined, state: i < last || FINAL_STATES.has(step.state) ? "done" : "current" };
          })}
        />
      ) : (
        <p className={styles.flowNote} role="status">{t("trackingNoSteps")}</p>
      )}
    </section>
  );
}

/** The sample tracking of a booking (canvas/OrderTracking; also the old technician-tracking page): the status, the arrival time, the collector with a call link and the tips (when the server names one), what to do before the sample, and the steps as the server logged them (polled every 15 s). The polling and the parsing are unchanged; this is its markup and texts. */
export function DiagnosticsSampleTrackingClient({ bookingId, locale }: { bookingId: string; locale: string }) {
  const t = useTranslations("DiagWeb");
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState(false);
  const stopped = useRef(false);

  const load = useCallback(async () => {
    try {
      const [bookingRes, trackingRes] = await Promise.all([
        fetch(`/api/patient/labs/bookings/${encodeURIComponent(bookingId)}`, { cache: "no-store", credentials: "same-origin" }),
        fetch(`/api/patient/labs/bookings/${encodeURIComponent(bookingId)}/tracking`, { cache: "no-store", credentials: "same-origin" }),
      ]);
      const booking = bookingRes.ok ? await bookingRes.json().catch(() => null) : null;
      const trackingJson = trackingRes.ok ? await trackingRes.json().catch(() => null) : null;
      setTracking(parseTracking({ booking, tracking: trackingJson }, locale));
      setError(false);
    } catch { setError(true); }
  }, [bookingId, locale]);

  useEffect(() => {
    stopped.current = false;
    load();
    const timer = setInterval(() => { if (!stopped.current) load(); }, 15000);
    return () => { stopped.current = true; clearInterval(timer); };
  }, [load]);

  if (!tracking && !error) return <p className={styles.flowNote} role="status">{t("loading")}</p>;
  if (error && !tracking) return <p className={consult.error} role="alert">{t("trackingFailed")}</p>;
  if (!tracking) return null;

  const status = diagStatus(tracking.state);
  const when = tracking.scheduledAt ? formatWhen(locale, tracking.scheduledAt) : null;

  return (
    <>
      <section className={rx.card} aria-label={t("trackingSummary")}>
        <div className={styles.eta}>
          <FIcon icon={LAB.icon} tone={LAB.tone} size={52} />
          <div className={styles.etaText} role="status">
            <span className={styles.etaLabel}>{tracking.eta !== null && tracking.eta !== undefined ? t("trackingArriving") : t("trackingStatus")}</span>
            <span className={styles.etaValue}>{tracking.eta !== null && tracking.eta !== undefined ? minutesText(locale, tracking.eta) : status.key === "unknown" ? t("trackingInProgress") : t(`status_${status.key}`)}</span>
          </div>
          {status.key !== "unknown" ? <StatusChip label={t(`status_${status.key}`)} tone={status.tone} /> : null}
        </div>
        {when ? <p className={styles.flowNote}>{t("trackingScheduled", { when })}</p> : null}
      </section>

      {!tracking.techName && !tracking.techPhone && tracking.home && !FINAL_STATES.has(tracking.state ?? "") ? (
        <section className={rx.card} aria-label={t("collectorLabel")}>
          <div className={styles.etaText}>
            <span className={styles.etaLabel}>{t("collectorLabel")}</span>
            <span className={consult.rowTitle}>{t("collectorPending")}</span>
          </div>
        </section>
      ) : null}

      {tracking.techName || tracking.techPhone ? (
        <>
          <section className={rx.card} aria-label={t("collectorLabel")}>
            <div className={styles.eta}>
              <div className={styles.etaText}>
                <span className={styles.etaLabel}>{t("collectorLabel")}</span>
                {tracking.techName ? <span className={consult.rowTitle}>{tracking.techName}</span> : null}
              </div>
              {tracking.techPhone ? <a className={styles.callLink} href={`tel:${tracking.techPhone}`}>{t("collectorCall")}</a> : null}
            </div>
          </section>
        </>
      ) : null}

      <section className={rx.card} aria-labelledby="trk-before">
        <h2 id="trk-before" className={consult.sectionTitle}>{t("trackingBeforeTitle")}</h2>
        {tracking.preparation.length > 0 ? (
          tracking.preparation.map((p) => (
            <div key={p.key}>
              {p.name ? <p className={consult.rowTitle}>{p.name}</p> : null}
              <BulletList items={p.lines} />
            </div>
          ))
        ) : (
          <p className={styles.flowNote}>{t("trackingPrepAsk")}</p>
        )}
      </section>

      <TrackingSteps steps={tracking.steps} locale={locale} />
    </>
  );
}
