"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { usePharmacyAction } from "./use-pharmacy-action";
import styles from "./offers.module.css";

/**
 * The waiting screen's two actions. The status is read again only when the patient asks (manual refresh); cancelling
 * the order is a governed mutation behind an explicit confirmation, and only a real answer from the server moves on.
 */
export function WaitingActions({ orderId, canCancel }: { orderId: string; canCancel: boolean }) {
  const t = useTranslations("PharmacyOffers");
  const locale = useLocale();
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const action = usePharmacyAction();

  async function cancel() {
    const result = await action.run(`cancel:${orderId}`, `/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}/cancel`, { reason: "patient_requested" });
    if (result?.ok) router.replace(`/${locale}/pharmacy`);
  }

  return (
    <div className={styles.actions}>
      <Button label={t("refreshStatus")} size="lg" fullWidth loading={refreshing} disabled={action.pending} onClick={() => startTransition(() => router.refresh())} />
      {canCancel && !confirming ? <Button label={t("cancelOrder")} variant="outline" size="lg" fullWidth disabled={action.pending} onClick={() => setConfirming(true)} /> : null}
      {canCancel && confirming ? (
        <div className={`${styles.notice} ${styles.noticeWarn}`} role="group" aria-labelledby="cancel-title">
          <div className={styles.actions}>
            <p className={styles.panelTitle} id="cancel-title">{t("cancelConfirmTitle")}</p>
            <p className={styles.note}>{t("cancelConfirmBody")}</p>
            <div className={styles.actionsRow}>
              <Button label={action.pending ? t("processing") : t("cancelConfirmYes")} variant="danger" size="md" loading={action.pending} onClick={cancel} />
              <Button label={t("cancelKeep")} variant="secondary" size="md" disabled={action.pending} onClick={() => { setConfirming(false); action.reset(); }} />
            </div>
          </div>
        </div>
      ) : null}
      {action.error ? <p className={styles.errorText} role="alert">{t(`errors.${action.error}`)}</p> : null}
    </div>
  );
}
