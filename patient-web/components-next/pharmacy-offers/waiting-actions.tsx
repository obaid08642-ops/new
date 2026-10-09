"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { CancelOrder } from "./cancel-order";
import styles from "./offers.module.css";

/**
 * The waiting screen's two actions. The status is read again only when the patient asks (manual refresh); cancelling
 * the order is a governed mutation behind an explicit confirmation, and only a real answer from the server moves on.
 */
export function WaitingActions({ orderId, canCancel }: { orderId: string; canCancel: boolean }) {
  const t = useTranslations("PharmacyOffers");
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();

  return (
    <div className={styles.actions}>
      <Button label={t("refreshStatus")} size="lg" fullWidth loading={refreshing} onClick={() => startTransition(() => router.refresh())} />
      {canCancel ? <CancelOrder orderId={orderId} after="pharmacy" /> : null}
    </div>
  );
}
