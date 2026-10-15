"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { usePharmacyAction } from "./use-pharmacy-action";
import styles from "./offers.module.css";

type Intent = "co-pay" | "self-pay";

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
