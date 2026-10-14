"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { buildCodRegistrationRequest, buildFinalQuoteAcceptanceRequest } from "@/lib/api/pharmacy-actions";
import { usePharmacyAction } from "./use-pharmacy-action";
import styles from "./offers.module.css";

type Props = {
  orderId: string;
  /** The server's quote handle: accepting is only ever done against the hash and revision the server sent. */
  quoteHash?: string;
  quoteRevision?: number;
  canAccept: boolean;
  canRegisterCod: boolean;
  /** After cash on delivery is registered: stay on the page (`refresh`) or go to the order's tracking. */
  afterCod: "refresh" | "tracking";
};

/** Accept the final price, or register cash on delivery. One request at a time; the failure shown is the server's. */
export function QuoteActions({ orderId, quoteHash, quoteRevision, canAccept, canRegisterCod, afterCod }: Props) {
  const t = useTranslations("PharmacyOffers");
  const locale = useLocale();
  const router = useRouter();
  const action = usePharmacyAction();

  async function accept() {
    const request = buildFinalQuoteAcceptanceRequest(orderId, quoteHash, quoteRevision);
    if (!request) return;
    const result = await action.run(`quote:${quoteHash}:${quoteRevision}`, request.path, request.body);
    if (result?.ok) router.refresh();
  }

  async function registerCod() {
    const request = buildCodRegistrationRequest(orderId);
    if (!request) return;
    const result = await action.run(`cod:${orderId}`, request.path, request.body);
    if (!result?.ok) return;
    if (afterCod === "tracking") router.replace(`/${locale}/orders/${encodeURIComponent(orderId)}/tracking`);
    else router.refresh();
  }

  const accepting = action.pending && action.activeId?.startsWith("quote:");
  const registering = action.pending && action.activeId?.startsWith("cod:");
  return (
    <div className={styles.actions}>
      {canAccept ? <Button label={accepting ? t("processing") : t("quoteAccept")} size="lg" fullWidth loading={accepting} disabled={action.pending} onClick={accept} /> : null}
      {canRegisterCod ? <Button label={registering ? t("processing") : t("codRegister")} size="lg" fullWidth loading={registering} disabled={action.pending} onClick={registerCod} /> : null}
      {action.error ? <p className={styles.errorText} role="alert">{t(`errors.${action.error}`)}</p> : null}
    </div>
  );
}
