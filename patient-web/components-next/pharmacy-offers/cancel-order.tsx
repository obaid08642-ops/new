"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { usePharmacyAction } from "./use-pharmacy-action";
import styles from "./offers.module.css";

/**
 * Cancelling a pharmacy order: a governed mutation (POST /patient/pharmacy/orders/:id/cancel) behind an explicit
 * confirmation. Only a real answer from the server moves on: `pharmacy` goes back to the pharmacy hub (the waiting
 * order is gone), `refresh` reads the order again so its page shows the cancelled status the server now holds.
 */
export function CancelOrder({ orderId, after, rules = [] }: { orderId: string; after: "pharmacy" | "refresh"; rules?: string[] }) {
  const t = useTranslations("PharmacyOffers");
  const locale = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const action = usePharmacyAction();

  async function cancel() {
    const result = await action.run(`cancel:${orderId}`, `/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}/cancel`, { reason: "patient_requested" });
    if (!result?.ok) return;
    if (after === "pharmacy") router.replace(`/${locale}/pharmacy`);
    else router.refresh();
  }

  return (
    <>
      {!confirming ? <Button label={t("cancelOrder")} variant="outline" size="lg" fullWidth disabled={action.pending} onClick={() => setConfirming(true)} /> : null}
      {confirming ? (
        <div className={`${styles.notice} ${styles.noticeWarn}`} role="group" aria-labelledby={`cancel-title-${orderId}`}>
          <div className={styles.actions}>
            <p className={styles.panelTitle} id={`cancel-title-${orderId}`}>{t("cancelConfirmTitle")}</p>
            <p className={styles.note}>{t("cancelConfirmBody")}</p>
            {rules.map((rule) => <p key={rule} className={styles.note}>{rule}</p>)}
            <div className={styles.actionsRow}>
              <Button label={action.pending ? t("processing") : t("cancelConfirmYes")} variant="danger" size="md" loading={action.pending} onClick={cancel} />
              <Button label={t("cancelKeep")} variant="secondary" size="md" disabled={action.pending} onClick={() => { setConfirming(false); action.reset(); }} />
            </div>
          </div>
        </div>
      ) : null}
      {action.error ? <p className={styles.errorText} role="alert">{t(`errors.${action.error}`)}</p> : null}
    </>
  );
}
