"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { InsuranceRequest } from "@/lib/api/insurance-request";
import { isHttpsCheckoutUrl } from "@/lib/api/checkout-url";
import { formatPrice } from "@/lib/format-price";
import { requestTone } from "@/lib/insurance/view";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Spinner } from "@/components-next/ui-generated/components/Spinner";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { Notice } from "@/components-next/consult/consult-parts";
import { StatusBadge } from "./insurance-kit";
import forms from "@/components-next/consult/consult.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./insurance.module.css";

type Method = "card" | "apple-pay" | "google-pay";
type Mode = "copay" | "self-pay";
type Capabilities = { booking_id: string; amount: number; currency: "SAR"; purpose: "insurance_copay" | "insurance_self_pay"; methods: Array<{ id: Method; kind: "online" }> };

/** The server re-reads the request every 6 seconds while the provider has not decided (as the old approval-wait page did). */
const POLL_MS = 6000;

/**
 * The one page of an insurance request (merge map 2, section 6): its state decides what shows. Waiting for the provider,
 * covered in full, a co-pay to pay, a declined request that may be paid by the patient, a self-pay to pay, paid, cancelled.
 * The state, the amounts and the reason are the server's. The calls are the ones the old request, co-pay and payment-split
 * pages made, with the same bodies and idempotency keys: payment-capabilities (GET), accept-self-pay (POST) and payment-intent
 * (POST, only an https checkout address is followed).
 */
export function InsuranceRequestView({ request, price, bookingStatusHref }: { request: InsuranceRequest; price?: number; bookingStatusHref: string | null }) {
  const t = useTranslations("InsuranceWeb");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const money = (value: number) => formatPrice(locale, value).text;

  useEffect(() => {
    if (request.state !== "PENDING_PROVIDER_REVIEW") return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [request.state, router]);

  async function loadCapabilities(nextMode: Mode) {
    if (loading) return;
    setLoading(true); setMessage(null); setCapabilities(null);
    try {
      const response = await fetch(`/api/insurance/requests/${request.id}/payment-capabilities?mode=${nextMode}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) { setMessage(t("request.noOnline")); return; }
      setCapabilities(data as Capabilities);
      setMode(nextMode);
    } catch { setMessage(t("request.optionsFailed")); } finally { setLoading(false); }
  }

  async function acceptSelfPay() {
    if (loading) return;
    setLoading(true); setMessage(null);
    try {
      const response = await fetch(`/api/insurance/requests/${request.id}/accept-self-pay`, { method: "POST", headers: { "idempotency-key": crypto.randomUUID() } });
      if (!response.ok) { setMessage(t("request.acceptFailed")); return; }
      router.refresh();
    } catch { setMessage(t("request.acceptRetry")); } finally { setLoading(false); }
  }

  async function begin(method: Method) {
    if (loading || !mode || !capabilities?.methods.some((item) => item.id === method)) return;
    setLoading(true); setMessage(null);
    try {
      const response = await fetch(`/api/insurance/requests/${request.id}/payment-intent`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ method }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !isHttpsCheckoutUrl(data?.checkoutUrl)) { setMessage(t("request.payFailed")); return; }
      window.location.assign(data.checkoutUrl);
    } catch { setMessage(t("request.payRetry")); } finally { setLoading(false); }
  }

  const state = request.state;
  const payMode: Mode | null = state === "COPAY_PENDING" ? "copay" : state === "SELF_PAY_PENDING" ? "self-pay" : null;
  const methodLabel = (method: Method) => (method === "apple-pay" ? t("request.methodApple") : method === "google-pay" ? t("request.methodGoogle") : t("request.methodCard"));
  const amounts: Array<{ label: string; value: number }> = [];
  if (price !== undefined) amounts.push({ label: t("request.total"), value: price });
  if (request.copayAmount !== undefined) amounts.push({ label: t("request.copay"), value: request.copayAmount });
  if (request.selfPayAmount !== undefined) amounts.push({ label: t("request.selfPay"), value: request.selfPayAmount });

  return (
    <div className={styles.stack}>
      <section className={`${rx.card} ${styles.policy}`} aria-labelledby="insurance-request-title">
        <div className={styles.policyTop}>
          <FIcon icon="shield-check" tone="blue" size={44} />
          <StatusBadge tone={requestTone(state)}>{t(`requestState.${state}`)}</StatusBadge>
        </div>
        <div>
          <h2 id="insurance-request-title" className={styles.policyName}>{t(`request.title.${state}`)}</h2>
          <span className={styles.policySub}>{t(`request.lead.${state}`)}</span>
        </div>
        {state === "PENDING_PROVIDER_REVIEW" ? <p className={styles.waiting} role="status"><Spinner size={20} /><span>{t("request.checking")}</span></p> : null}
      </section>

      {amounts.length > 0 ? (
        <section className={rx.card} aria-label={t("request.amounts")}>
          <ul className={styles.amounts}>
            {amounts.map((row) => (
              <li key={row.label}><span className={styles.amountLabel}>{row.label}</span><span className={styles.amountValue}><bdi>{money(row.value)}</bdi></span></li>
            ))}
          </ul>
        </section>
      ) : null}

      {state === "REJECTED" ? (
        <>
          <Notice warn>{request.rejectionReason ? t("request.reason", { reason: request.rejectionReason }) : t("request.noReason")}</Notice>
          <Button label={t("request.acceptSelfPay")} size="lg" fullWidth loading={loading} onClick={() => void acceptSelfPay()} />
        </>
      ) : null}

      {payMode && !capabilities ? (
        <Button label={t("request.showOptions")} size="lg" fullWidth loading={loading} onClick={() => void loadCapabilities(payMode)} />
      ) : null}

      {capabilities ? (
        <section className={rx.card} aria-label={t("request.methods")}>
          <p className={styles.amountLabel}>{t("request.due", { amount: money(capabilities.amount) })}</p>
          {capabilities.methods.length === 0 ? <Notice>{t("request.noMethods")}</Notice> : (
            <div className={styles.methods}>
              {capabilities.methods.map((item) => (
                <Button key={item.id} label={methodLabel(item.id)} size="lg" variant="outline" fullWidth disabled={loading} onClick={() => void begin(item.id)} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {message ? <p className={forms.error} role="alert">{message}</p> : null}

      {(state === "APPROVED_FULL" || state === "COPAY_PAID" || state === "SELF_PAY_PAID") && bookingStatusHref ? (
        <ButtonLink href={bookingStatusHref} label={t("request.viewBooking")} fullWidth />
      ) : null}
      {state === "PENDING_PROVIDER_REVIEW" || payMode ? <Button label={t("request.refresh")} size="md" variant="ghost" fullWidth disabled={loading} onClick={() => router.refresh()} /> : null}
      <p className={styles.note}>{t("disclaimer")}</p>
    </div>
  );
}
