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

type Step = { title: string; time?: string; done?: boolean };
type Tracking = { state?: string; eta?: number | null; techName?: string; techPhone?: string; scheduledAt?: string; steps: Step[] };

function parseTracking(payload: unknown): Tracking {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const t = (root.tracking && typeof root.tracking === "object" ? root.tracking : root) as Record<string, unknown>;
  const b = (root.booking && typeof root.booking === "object" ? root.booking : null) as Record<string, unknown> | null;
  const stepsRaw = Array.isArray(t.steps) ? t.steps : [];
  const steps: Step[] = stepsRaw.flatMap((s) => {
    if (!s || typeof s !== "object") return [];
    const o = s as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : typeof o.title_ar === "string" ? o.title_ar : null;
    if (!title) return [];
    return [{ title, time: typeof o.time === "string" ? o.time : undefined, done: o.done === true }];
  });
  const techName = typeof t.techName === "string" ? t.techName : typeof t.tech_name === "string" ? t.tech_name : undefined;
  const techPhone = typeof t.techPhone === "string" && t.techPhone.trim() ? t.techPhone : typeof t.tech_phone === "string" && t.tech_phone.trim() ? t.tech_phone : undefined;
  return {
    state: b && typeof b.state === "string" ? b.state : undefined,
    eta: typeof t.eta === "number" ? t.eta : typeof t.eta_minutes === "number" ? t.eta_minutes : null,
    techName,
    techPhone,
    scheduledAt: b && typeof b.scheduled_at === "string" ? b.scheduled_at : undefined,
    steps,
  };
}

/** The steps exactly as the server logged them; when it sent none, a plain "no tracking yet" line (no invented steps). */
export function TrackingSteps({ steps }: { steps: Step[] }) {
  const t = useTranslations("DiagWeb");
  const current = steps.findIndex((step) => !step.done);
  return (
    <section className={rx.card} aria-labelledby="trk-steps">
      <h2 id="trk-steps" className={consult.sectionTitle}>{t("trackingStepsTitle")}</h2>
      {steps.length > 0 ? (
        <Timeline
          label={t("trackingStepsTitle")}
          steps={steps.map((step, i) => ({ id: `${i}`, label: step.title, time: step.time, state: step.done ? "done" : i === current ? "current" : "upcoming" }))}
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
      setTracking(parseTracking({ booking, tracking: trackingJson }));
      setError(false);
    } catch { setError(true); }
  }, [bookingId]);

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
          <section className={rx.card} aria-labelledby="tech-tips">
            <h2 id="tech-tips" className={consult.sectionTitle}>{t("collectorTipsTitle")}</h2>
            <BulletList items={[t("collectorTip1"), t("collectorTip2"), t("collectorTip3")]} />
          </section>
        </>
      ) : null}

      <section className={rx.card} aria-labelledby="trk-before">
        <h2 id="trk-before" className={consult.sectionTitle}>{t("trackingBeforeTitle")}</h2>
        <p className={styles.flowNote}>{t("trackingBeforeBody")}</p>
      </section>

      <TrackingSteps steps={tracking.steps} />
    </>
  );
}
