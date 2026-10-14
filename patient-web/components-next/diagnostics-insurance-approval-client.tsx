"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { formatPrice, formatNumber } from "@/lib/format-price";
import consult from "@/components-next/consult/consult.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/diagnostics/diag.module.css";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";

type Item = { id: string; name: string; price: number; covered: boolean; rejectReason?: string };
type OrderState = {
  status: string; totalAmount: number; coveredAmount: number; coveragePercent: number;
  copayAmount: number; items: Item[];
};

const TERMINAL = new Set(["approved", "partial_approval", "rejected"]);
const INSURANCE = SERVICE_ICONS.insurance;
/** The message keys of the errors this screen shows (the text is looked up where it is drawn, so the polling callback does not depend on the translator). */
const ERROR = { load: "approvalLoadFailed", connection: "connectionFailed", choice: "approvalChoiceFailed" } as const;

function parseOrder(payload: unknown): OrderState | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const r = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const itemsRaw = Array.isArray(r.items) ? r.items : [];
  const items: Item[] = itemsRaw.flatMap((it) => {
    if (!it || typeof it !== "object") return [];
    const o = it as Record<string, unknown>;
    const id = typeof o.service_id === "string" ? o.service_id : typeof o.id === "string" ? o.id : null;
    const name = typeof o.name_ar === "string" ? o.name_ar : typeof o.name_en === "string" ? o.name_en : typeof o.name === "string" ? o.name : null;
    if (!id || !name) return [];
    const covered = o.isCovered === true;
    return [{
      id,
      name,
      price: Number(o.cashPrice ?? o.price ?? 0) || 0,
      covered,
      rejectReason: typeof o.rejectReason === "string" ? o.rejectReason : undefined,
    }];
  });
  const totalAmount = items.reduce((sum, i) => sum + i.price, 0);
  const copayAmount = Number(r.insurance_copay ?? 0) || 0;
  const coveredAmount = Math.max(0, totalAmount - copayAmount);
  const coveragePercent = totalAmount > 0 ? Math.round((coveredAmount / totalAmount) * 100) : 0;
  return {
    status: typeof r.insurance_status === "string" ? r.insurance_status : "pending",
    totalAmount, coveredAmount, coveragePercent, copayAmount, items,
  };
}

/** The insurance approval of an order (canvas/OrderTracking): the decision as it arrives (polled every 3 s), what is covered, what the patient may pay in cash instead, the summary and the way on. The polling, the cash choice and the amounts are unchanged; this is its markup and texts. */
export function DiagnosticsInsuranceApprovalClient({ orderId, labName, visitType, locale }: {
  orderId: string; labName: string; visitType: string; locale: string;
}) {
  const t = useTranslations("DiagWeb");
  const [order, setOrder] = useState<OrderState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cashOptIn, setCashOptIn] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const money = (value: number) => formatPrice(locale, value).text;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/patient/labs/bookings/${encodeURIComponent(orderId)}`, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) { setError(ERROR.load); return; }
      const parsed = parseOrder(await res.json().catch(() => null));
      if (!parsed) { setError(ERROR.load); return; }
      setOrder(parsed); setError(null);
    } catch { setError(ERROR.connection); }
  }, [orderId]);

  useEffect(() => {
    load();
    timer.current = setInterval(async () => {
      if (order && TERMINAL.has(order.status)) { if (timer.current) clearInterval(timer.current); return; }
      await load();
    }, 3000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load, order?.status]);

  async function toggleCash(item: Item, next: boolean) {
    setSaving(item.id);
    const prev = cashOptIn[item.id] ?? false;
    setCashOptIn((s) => ({ ...s, [item.id]: next }));
    try {
      const res = await fetch(`/api/patient/labs/bookings/${encodeURIComponent(orderId)}/items/${encodeURIComponent(item.id)}/opt-in-cash`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "idempotency-key": `web-optin-${orderId}-${item.id}-${Date.now()}` },
        body: JSON.stringify({ optInCash: next }),
        credentials: "same-origin",
      });
      if (!res.ok) { setCashOptIn((s) => ({ ...s, [item.id]: prev })); setError(ERROR.choice); }
      else await load();
    } catch { setCashOptIn((s) => ({ ...s, [item.id]: prev })); setError(ERROR.connection); }
    finally { setSaving(null); }
  }

  if (!order && !error) return <p className={styles.flowNote} role="status">{t("approvalSent")}</p>;
  if (error && !order) return <p className={consult.error} role="alert">{t(error)}</p>;
  if (!order) return null;

  const resolved = TERMINAL.has(order.status);
  const headerKey = order.status === "approved" ? "approvalApproved" : order.status === "partial_approval" ? "approvalPartial" : order.status === "rejected" ? "approvalRejected" : "approvalWaiting";
  const hybridCash = order.items.filter((i) => !i.covered && order.status !== "rejected" && (cashOptIn[i.id] ?? false))
    .reduce((s, i) => s + i.price, 0);
  // Only server amounts; no invented 50 SAR home-visit fee (needs-review issue 632).
  const finalToPay = order.status === "rejected" ? 0 : order.copayAmount + hybridCash;
  const checkoutQuery = order.status === "rejected"
    ? `visitType=${encodeURIComponent(visitType)}&isInsurance=false&total=${order.totalAmount}`
    : `visitType=${encodeURIComponent(visitType)}&isInsurance=hybrid&copay=${finalToPay}`;
  const tone = order.status === "approved" ? DIAG_TONES.good : order.status === "partial_approval" ? DIAG_TONES.warn : order.status === "rejected" ? DIAG_TONES.quiet : DIAG_TONES.info;

  return (
    <>
      <section className={rx.card} aria-label={t("approvalStatus")}>
        <div className={styles.eta}>
          <FIcon icon={INSURANCE.icon} tone={INSURANCE.tone} size={52} />
          <div className={styles.etaText} role="status">
            <span className={styles.etaLabel}>{t(headerKey)}</span>
            <span className={styles.etaValue}>{labName}</span>
          </div>
          <StatusChip label={t(headerKey)} tone={tone} />
        </div>
      </section>
      {error ? <p className={consult.error} role="alert">{t(error)}</p> : null}

      <section className={rx.card} aria-label={t("coverageDetails")}>
        <h2 className={consult.sectionTitle}>{t("coverageDetails")}</h2>
        <ul className={styles.coverage}>
          {order.items.map((item) => (
            <li key={item.id}>
              <div className={styles.coverageRow}>
                <span className={consult.rowTitle}>{item.name}</span>
                <span className={styles.price}><bdi>{money(item.price)}</bdi></span>
                <StatusChip label={item.covered ? t("covered") : t("notCovered")} tone={item.covered ? DIAG_TONES.good : DIAG_TONES.quiet} />
              </div>
              {!item.covered && order.status !== "rejected" ? (
                <>
                  {item.rejectReason ? <p className={styles.flowNote}>{t("rejectReason", { reason: item.rejectReason })}</p> : null}
                  <label className={styles.check}>
                    <input type="checkbox" checked={cashOptIn[item.id] ?? false} disabled={saving === item.id} onChange={(e) => toggleCash(item, e.target.checked)} />
                    <span>{t("payCashFor", { price: money(item.price) })}</span>
                  </label>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {order.status !== "rejected" && resolved ? (
        <section className={rx.card} aria-label={t("financialSummary")}>
          <h2 className={consult.sectionTitle}>{t("financialSummary")}</h2>
          <div className={styles.line}><span>{t("summaryTotal")}</span><span className={styles.lineValue}><bdi>{money(order.totalAmount)}</bdi></span></div>
          <div className={styles.line}><span>{t("summaryCovered", { percent: formatNumber(locale, order.coveragePercent) })}</span><span className={styles.lineValue}><bdi>{money(order.coveredAmount)}</bdi></span></div>
          {hybridCash > 0 ? <div className={styles.line}><span>{t("summaryExtraCash")}</span><span className={styles.lineValue}><bdi>{money(hybridCash)}</bdi></span></div> : null}
          <div className={styles.totalLine}><span>{t("summaryDue")}</span><span><bdi>{money(finalToPay)}</bdi></span></div>
        </section>
      ) : null}

      <div className={consult.actions}>
        {order.status === "rejected" ? (
          <>
            <ButtonLink href={`/${locale}/diagnostics/checkout?${checkoutQuery}`} label={t("proceedSelfPay")} />
            <ButtonLink href={`/${locale}/consultations`} label={t("requestConsultation")} variant="outline" />
          </>
        ) : resolved ? (
          <ButtonLink href={`/${locale}/diagnostics/checkout?${checkoutQuery}`} label={t("continueToPayment")} />
        ) : (
          <p className={consult.notice} role="status">{t("waitingForDecision")}</p>
        )}
      </div>
    </>
  );
}
