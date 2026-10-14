"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { checkoutUrlOf, isTrustedCheckoutUrl, parsePatientPharmacyPaymentCapabilities, transactionIdOf, type PatientPharmacyOnlineMethod } from "@/lib/api/pharmacy-payment";
import { rememberPayment } from "@/lib/pharmacy/payment-return";
import { formatMoney } from "./format";
import { usePharmacyAction } from "./use-pharmacy-action";
import styles from "./offers.module.css";

type Intent = "co-pay" | "self-pay";
type Capabilities = { methods: PatientPharmacyOnlineMethod[]; amount: number; currency: string };

const METHOD_KEY = { card: "methodCard", "apple-pay": "methodApplePay", "google-pay": "methodGooglePay" } as const satisfies Record<PatientPharmacyOnlineMethod, string>;

/** The methods the server offers for this order and the amount it will charge: read, never guessed. */
function useCapabilities(orderId: string) {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  async function load() {
    if (state === "loading") return;
    setState("loading");
    try {
      const response = await fetch(`/api/patient/payments/pharmacy/${encodeURIComponent(orderId)}/capabilities`, { cache: "no-store", credentials: "same-origin" });
      const parsed = response.ok ? parsePatientPharmacyPaymentCapabilities(await response.json().catch(() => null)) : null;
      if (!parsed || parsed.methods.length === 0) { setState("failed"); return; }
      setCapabilities({ methods: parsed.methods.map((method) => method.id), amount: parsed.amount, currency: parsed.currency });
      setState("idle");
    } catch {
      setState("failed");
    }
  }
  return { capabilities, loading: state === "loading", failed: state === "failed", load };
}

/** After the final price is accepted: pick an online method, then the server's own checkout page takes the payment. */
export function OnlinePaymentActions({ orderId }: { orderId: string }) {
  const t = useTranslations("PharmacyOffers");
  const locale = useLocale();
  const caps = useCapabilities(orderId);
  const action = usePharmacyAction();
  const [handoff, setHandoff] = useState<"going" | "none" | null>(null);

  async function start(method: PatientPharmacyOnlineMethod) {
    setHandoff(null);
    // the bounded route: it hands the browser only the transaction, its status and the secure checkout address
    const result = await action.run(`pay:${method}`, `/api/payments/pharmacy/${encodeURIComponent(orderId)}/intent`, { method });
    if (!result) return;
    if (!result.ok) return;
    const checkoutUrl = checkoutUrlOf(result.data);
    if (isTrustedCheckoutUrl(checkoutUrl)) {
      // the provider sends the patient back with its own payment id only: remember which order and transaction this was
      const transactionId = transactionIdOf(result.data);
      if (transactionId) rememberPayment({ orderId, transactionId });
      setHandoff("going");
      window.location.assign(checkoutUrl);
      return;
    }
    // The server answered but gave no secure checkout address: no payment was made, and none is claimed.
    setHandoff("none");
  }

  return (
    <div className={styles.panel}>
      {caps.capabilities ? (
        <>
          <p className={styles.panelTitle}>{t("showMethods")} · {formatMoney(locale, caps.capabilities.amount, caps.capabilities.currency)}</p>
          <div className={styles.actions}>
            {caps.capabilities.methods.map((method) => (
              <Button
                key={method}
                label={action.pending && action.activeId === `pay:${method}` ? t("processing") : t(METHOD_KEY[method])}
                variant="secondary"
                size="lg"
                fullWidth
                loading={action.pending && action.activeId === `pay:${method}`}
                disabled={action.pending}
                onClick={() => start(method)}
              />
            ))}
          </div>
        </>
      ) : (
        <Button label={caps.loading ? t("loadingMethods") : t("showMethods")} size="lg" fullWidth loading={caps.loading} onClick={caps.load} />
      )}
      {caps.failed ? <p className={styles.errorText} role="alert">{t("paymentUnavailable")}</p> : null}
      {action.error ? <p className={styles.errorText} role="alert">{action.error === "generic" ? t("paymentError") : t(`errors.${action.error}`)}</p> : null}
      {handoff ? <p className={handoff === "going" ? styles.okText : styles.errorText} role={handoff === "going" ? "status" : "alert"}>{handoff === "going" ? t("redirecting") : t("noRedirect")}</p> : null}
    </div>
  );
}

/**
 * The insurer's decision becomes the patient's only through these two explicit choices. Accepting needs no payment
 * method: the method is chosen on the payment step, where the server states the amount (the patient's share, or the
 * full price) and the methods it offers. (The payment capabilities are refused until the decision is accepted, so
 * asking for them here would leave the patient with no button.)
 */
export function InsuranceDecisionActions({ orderId, canCoPay, canSelfPay }: { orderId: string; canCoPay: boolean; canSelfPay: boolean }) {
  const t = useTranslations("PharmacyOffers");
  const router = useRouter();
  const locale = useLocale();
  const action = usePharmacyAction();
  const [accepted, setAccepted] = useState<Intent | null>(null);

  async function accept(intent: Intent) {
    const result = await action.run(`insurance:${intent}`, `/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}/insurance/${intent}/accept`, {});
    if (!result?.ok) return;
    setAccepted(intent);
    // accepting unlocks the payment step: the server now has an amount to collect
    router.push(`/${locale}/pharmacy/payment?orderId=${encodeURIComponent(orderId)}`);
  }

  if (!canCoPay && !canSelfPay) return null;
  const choices = [...(canCoPay ? [{ intent: "co-pay" as const, label: t("acceptCoPay") }] : []), ...(canSelfPay ? [{ intent: "self-pay" as const, label: t("acceptSelfPay") }] : [])];
  return (
    <div className={styles.actions}>
      {choices.map(({ intent, label }) => {
        const here = action.pending && action.activeId === `insurance:${intent}`;
        return (
          <Button
            key={intent}
            label={here ? t("processing") : label}
            variant={intent === "co-pay" ? "primary" : "secondary"}
            size="lg"
            fullWidth
            loading={here}
            disabled={action.pending || accepted !== null}
            onClick={() => accept(intent)}
          />
        );
      })}
      {action.error ? <p className={styles.errorText} role="alert">{t(`errors.${action.error}`)}</p> : null}
      {accepted ? <p className={styles.okText} role="status">{accepted === "co-pay" ? t("coPayAccepted") : t("selfPayAccepted")}</p> : null}
    </div>
  );
}

/** The way out of a rejected insurance decision besides paying the full price: cancel the order (the backend releases what it held). */
export function RejectedInsuranceCancel({ orderId }: { orderId: string }) {
  const t = useTranslations("PharmacyOffers");
  const locale = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const action = usePharmacyAction();

  async function cancel() {
    const result = await action.run(`reject-cancel:${orderId}`, `/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}/insurance-rejection/cancel`, {});
    if (result?.ok) router.replace(`/${locale}/pharmacy`);
  }

  return (
    <div className={styles.actions}>
      {!confirming ? <Button label={t("cancelOrder")} variant="outline" size="lg" fullWidth disabled={action.pending} onClick={() => setConfirming(true)} /> : (
        <div className={`${styles.notice} ${styles.noticeWarn}`} role="group" aria-labelledby="reject-cancel-title">
          <div className={styles.actions}>
            <p className={styles.panelTitle} id="reject-cancel-title">{t("cancelConfirmTitle")}</p>
            <p className={styles.note}>{t("cancelConfirmBody")}</p>
            <div className={styles.actionsRow}>
              <Button label={action.pending ? t("processing") : t("cancelConfirmYes")} variant="danger" size="md" loading={action.pending} onClick={cancel} />
              <Button label={t("cancelKeep")} variant="secondary" size="md" disabled={action.pending} onClick={() => { setConfirming(false); action.reset(); }} />
            </div>
          </div>
        </div>
      )}
      {action.error ? <p className={styles.errorText} role="alert">{t(`errors.${action.error}`)}</p> : null}
    </div>
  );
}
