"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CoreShell } from "@/components-next/core/core-shell";
import { StickyFooter } from "@/components-next/ui-generated/shells";
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { LinkEmptyState } from "./link-empty-state";
import { formatDate } from "@/lib/format-date";
import { isOrderablePrescriptionState, prescriptionStateKey } from "@/lib/pharmacy/prescription-state";
import type { Locale } from "@/lib/i18n";
import { newIdempotencyKey, sendBroadcast } from "@/lib/pharmacy/broadcast";
import { AddressCard } from "./address-card";
import { RxMedicineList } from "./rx-medicines";
import { prescriptionStateTone } from "./rx-state";
import { useDeliveryAddress } from "./use-delivery-address";
import { PHARMACY_TONE } from "./tones";
import rx from "./rx.module.css";

export type OrderablePrescription = {
  id: string;
  state?: string;
  issuedAt?: string;
  doctorName?: string;
  items: Array<{ name: string; dose?: string }>;
};

/**
 * "Order the medicines of this prescription" (canvas/RxUpload family). The request goes to the nearby pharmacies with
 * the prescription attached (POST /patient/pharmacy/orders with `prescription_id`, then /submit), exactly as the
 * mobile app broadcasts; no price or payment is set here (they come from the offer the patient picks).
 */
export function RxOrderScreen({ locale, prescription }: { locale: Locale; prescription: OrderablePrescription }) {
  const t = useTranslations("RxUpload");
  const rxT = useTranslations("Prescriptions");
  const flow = useTranslations("PharmacyFlow");
  const router = useRouter();
  const address = useDeliveryAddress(true);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<"session" | "send" | null>(null);
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  const names = prescription.items.map((item) => item.name);
  const orderable = isOrderablePrescriptionState(prescription.state);
  const issued = formatDate(locale, prescription.issuedAt);
  const canSend = orderable && names.length > 0 && address.status === "ready";

  async function send() {
    if (!canSend || sending || address.status !== "ready") return;
    setSending(true);
    setFailure(null);
    const signature = `${prescription.id}:${address.address.id}`;
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: newIdempotencyKey() };
    const result = await sendBroadcast({ kind: "prescription", prescriptionId: prescription.id, names }, address.address, attempt.current.key);
    if (result.ok) return router.push(`/${locale}/pharmacy/broadcast-status?orderId=${encodeURIComponent(result.orderId)}`);
    setSending(false);
    setFailure(result.reason === "unauthenticated" ? "session" : "send");
  }

  const sendButton = <Button label={sending ? t("sending") : t("sendOffers")} size="lg" fullWidth disabled={!canSend} loading={sending} onClick={() => void send()} />;

  return (
    <CoreShell
      locale={locale}
      title={t("orderTitle")}
      backHref={`/${locale}/prescriptions/${encodeURIComponent(prescription.id)}`}
      hideTabs
      width="narrow"
      footer={canSend ? <StickyFooter label={t("orderTitle")}><div className={rx.bar}>{sendButton}</div></StickyFooter> : undefined}
    >
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("orderTitle")}</h1></div>

        <div className={rx.chips}>
          <StatusChip label={rxT(prescriptionStateKey(prescription.state))} tone={prescriptionStateTone(prescription.state)} />
          {issued ? <span className={rx.note}>{rxT("issuedOn", { date: issued })}</span> : null}
          {prescription.doctorName ? <span className={rx.note}>{rxT("fromDoctor", { doctor: prescription.doctorName })}</span> : null}
        </div>

        {names.length > 0 ? (
          <RxMedicineList label={rxT("medications")} items={prescription.items.map((item) => ({ name: item.name, lines: item.dose ? [rxT("dose", { dose: item.dose })] : [] }))} />
        ) : (
          <div className={rx.state}>
            <LinkEmptyState
              icon="prescription"
              tone={PHARMACY_TONE}
              title={t("noItemsTitle")}
              body={t("noItemsBody")}
              actionLabel={t("title")}
              actionHref={`/${locale}/pharmacy/scan-prescription`}
              secondaryLabel={t("addByName")}
              secondaryHref={`/${locale}/pharmacy/request`}
            />
          </div>
        )}

        {!orderable ? <p className={rx.note} role="status">{rxT("notOrderable")}</p> : null}

        {orderable && names.length > 0 ? <AddressCard locale={locale} state={address} /> : null}

        {canSend ? <p className={rx.note}>{t("sendNote")}</p> : null}

        {failure ? (
          <div className={rx.error} role="alert">
            {failure === "session" ? flow("sessionEnded") : t("sendFailed")}
            {failure === "session" ? <div className={rx.errorActions}><Link className={rx.textLink} href={`/${locale}/login`}>{flow("signIn")}</Link></div> : null}
          </div>
        ) : null}

        {canSend ? <div className={rx.deskActions}>{sendButton}</div> : null}
      </div>
    </CoreShell>
  );
}
