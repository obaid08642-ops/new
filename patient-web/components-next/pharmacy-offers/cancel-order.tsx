"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ConfirmDialog } from "@/components-next/confirm/confirm-dialog";
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
      <ConfirmDialog
        open={confirming}
        title={t("cancelConfirmTitle")}
        body={[t("cancelConfirmBody"), ...rules].join(" ")}
        confirmLabel={action.pending ? t("processing") : t("cancelConfirmYes")}
        cancelLabel={t("cancelKeep")}
        destructive
        busy={action.pending}
        onConfirm={() => void cancel()}
        onCancel={() => { setConfirming(false); action.reset(); }}
      />
      {action.error ? <p className={styles.errorText} role="alert">{t(`errors.${action.error}`)}</p> : null}
    </>
  );
}
