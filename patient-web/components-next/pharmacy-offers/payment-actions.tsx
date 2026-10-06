"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { checkoutUrlOf, isTrustedCheckoutUrl, parsePatientPharmacyPaymentCapabilities, type PatientPharmacyOnlineMethod } from "@/lib/api/pharmacy-payment";
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
    const result = await action.run(`pay:${method}`, `/api/patient/payments/intent/pharmacy/${encodeURIComponent(orderId)}`, { method });
    if (!result) return;
    if (!result.ok) return;
    const checkoutUrl = checkoutUrlOf(result.data);
    if (isTrustedCheckoutUrl(checkoutUrl)) {
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

/** The insurer's decision is final for the patient only through these two explicit choices; each names the method. */
export function InsuranceDecisionActions({ orderId, canCoPay, canSelfPay }: { orderId: string; canCoPay: boolean; canSelfPay: boolean }) {
  const t = useTranslations("PharmacyOffers");
  const router = useRouter();
  const caps = useCapabilities(orderId);
  const action = usePharmacyAction();
  const [accepted, setAccepted] = useState<Intent | null>(null);

  async function accept(intent: Intent, method: PatientPharmacyOnlineMethod) {
    const result = await action.run(`insurance:${intent}:${method}`, `/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}/insurance/${intent}/accept`, { payment_method: method });
    if (!result?.ok) return;
    setAccepted(intent);
    router.refresh();
  }

  if (!canCoPay && !canSelfPay) return null;
  return (
    <div className={styles.actions}>
      {caps.capabilities ? (
        caps.capabilities.methods.flatMap((method) => [
          ...(canCoPay ? [{ intent: "co-pay" as const, method }] : []),
          ...(canSelfPay ? [{ intent: "self-pay" as const, method }] : []),
        ]).map(({ intent, method }) => {
          const id = `insurance:${intent}:${method}`;
          const here = action.pending && action.activeId === id;
          return (
            <Button
              key={id}
              label={here ? t("processing") : `${intent === "co-pay" ? t("acceptCoPay") : t("acceptSelfPay")} · ${t(METHOD_KEY[method])}`}
              variant={intent === "co-pay" ? "primary" : "secondary"}
              size="lg"
              fullWidth
              loading={here}
              disabled={action.pending || accepted !== null}
              onClick={() => accept(intent, method)}
            />
          );
        })
      ) : (
        <Button label={caps.loading ? t("loadingMethods") : t("showMethods")} size="lg" fullWidth loading={caps.loading} onClick={caps.load} />
      )}
      {caps.failed ? <p className={styles.errorText} role="alert">{t("paymentUnavailable")}</p> : null}
      {action.error ? <p className={styles.errorText} role="alert">{t(`errors.${action.error}`)}</p> : null}
      {accepted ? <p className={styles.okText} role="status">{accepted === "co-pay" ? t("coPayAccepted") : t("selfPayAccepted")}</p> : null}
    </div>
  );
}
