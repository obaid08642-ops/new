"use client";

import { useTranslations } from "next-intl";
import { CoreShell } from "@/components-next/core/core-shell";
import { StickyFooter } from "@/components-next/ui-generated/shells";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { LinkEmptyState } from "./link-empty-state";
import { formatDate } from "@/lib/format-date";
import { isOrderablePrescriptionState, prescriptionStateKey } from "@/lib/pharmacy/prescription-state";
import type { Locale } from "@/lib/i18n";
import { ButtonLink } from "./button-link";
import { RxMedicineList } from "./rx-medicines";
import { prescriptionStateTone } from "./rx-state";
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
 * "Order the medicines of this prescription" (canvas/RxUpload family): the prescription the patient picked. Owner decision
 * 39 (issues 1031, 1043), the app's flow: from here the patient goes on to the checkout opened on this prescription
 * (`/cart/checkout?prescriptionId=`), which sends its medicines with the cart's lines and `prescription_id`; nothing is
 * broadcast from this screen, and no price or payment is set here (they come from the offer the patient picks).
 */
export function RxOrderScreen({ locale, prescription }: { locale: Locale; prescription: OrderablePrescription }) {
  const t = useTranslations("RxUpload");
  const rxT = useTranslations("Prescriptions");

  const names = prescription.items.map((item) => item.name);
  const orderable = isOrderablePrescriptionState(prescription.state);
  const issued = formatDate(locale, prescription.issuedAt);
  const canContinue = orderable && names.length > 0;
  const next = `/${locale}/cart/checkout?prescriptionId=${encodeURIComponent(prescription.id)}`;
  const continueButton = <ButtonLink href={next} label={t("continueToRequest")} fullWidth />;

  return (
    <CoreShell
      locale={locale}
      title={t("orderTitle")}
      backHref={`/${locale}/prescriptions/${encodeURIComponent(prescription.id)}`}
      hideTabs
      width="narrow"
      footer={canContinue ? <StickyFooter label={t("orderTitle")}><div className={rx.bar}>{continueButton}</div></StickyFooter> : undefined}
    >
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("orderTitle")}</h1></div>

        <div className={rx.chips}>
          <span className={rx.note} data-testid="rx-number"><bdi>{t("rxNumber", { code: prescription.id.slice(-6).toUpperCase() })}</bdi></span>
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
              actionHref={`/${locale}/pharmacy/rx-order?via=photo`}
              secondaryLabel={t("addByName")}
              secondaryHref={`/${locale}/pharmacy/rx-order?via=type`}
            />
          </div>
        )}

        {!orderable ? <p className={rx.note} role="status">{rxT("notOrderable")}</p> : null}

        {canContinue ? <p className={rx.note}>{t("sendNote")}</p> : null}

        {canContinue ? <div className={rx.deskActions}>{continueButton}</div> : null}
      </div>
    </CoreShell>
  );
}
