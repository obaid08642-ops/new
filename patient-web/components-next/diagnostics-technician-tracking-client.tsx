"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { LAB, minutesText } from "@/components-next/diagnostics/diag-parts";
import { BulletList } from "@/components-next/consult/consult-parts";
import consult from "@/components-next/consult/consult.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/diagnostics/diag.module.css";

type Tracking = { eta?: number | null; techName?: string; techPhone?: string };

function parseTracking(payload: unknown): Tracking {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const t = (root.tracking && typeof root.tracking === "object" ? root.tracking : root) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  return {
    eta: num(t.eta) ?? num(t.eta_minutes),
    techName: str(t.techName) ?? str(t.tech_name),
    techPhone: str(t.techPhone) ?? str(t.tech_phone),
  };
}

/** The collector on the way (canvas/OrderTracking): the arrival time, the collector's name and a call link, and what to have ready (polled every 15 s). The polling and the parsing are unchanged; this is its markup and texts. */
export function DiagnosticsTechnicianTrackingClient({ bookingId, locale }: { bookingId: string; locale: string }) {
  const t = useTranslations("DiagWeb");
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState(false);
  const stopped = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/patient/labs/bookings/${encodeURIComponent(bookingId)}/tracking`, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) { setError(true); return; }
      setTracking(parseTracking(await res.json().catch(() => null)));
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
  const eta = tracking.eta !== null && tracking.eta !== undefined;

  return (
    <>
      <section className={rx.card} aria-label={t("collectorArrival")}>
        <div className={styles.eta}>
          <FIcon icon="moped" tone={LAB.tone} size={52} />
          <div className={styles.etaText} role="status">
            <span className={styles.etaLabel}>{t("collectorArrival")}</span>
            <span className={styles.etaValue}>{eta ? minutesText(locale, tracking.eta as number) : t("collectorNearby")}</span>
          </div>
        </div>
        {tracking.techName || tracking.techPhone ? (
          <div className={styles.eta}>
            <div className={styles.etaText}>
              <span className={styles.etaLabel}>{t("collectorLabel")}</span>
              {tracking.techName ? <span className={consult.rowTitle}>{tracking.techName}</span> : null}
            </div>
            {tracking.techPhone ? <a className={styles.callLink} href={`tel:${tracking.techPhone}`}>{t("collectorCall")}</a> : null}
          </div>
        ) : null}
      </section>

      <section className={rx.card} aria-labelledby="tech-tips">
        <h2 id="tech-tips" className={consult.sectionTitle}>{t("collectorTipsTitle")}</h2>
        <BulletList items={[t("collectorTip1"), t("collectorTip2"), t("collectorTip3")]} />
      </section>
    </>
  );
}
