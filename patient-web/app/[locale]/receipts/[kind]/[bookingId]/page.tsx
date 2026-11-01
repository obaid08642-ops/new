import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getInvoice } from "@/lib/api/billing-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatNumber } from "@/lib/format-price";
import { isLocale } from "@/lib/i18n";
import { extractReceipt, isReceiptKind } from "@/lib/receipt/model";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ReceiptActions } from "@/components-next/receipt/receipt-actions";
import { ReceiptPaper } from "@/components-next/receipt/receipt-paper";
import { receiptLabels } from "@/lib/receipt/labels";

type Props = { params: Promise<{ locale: string; kind: string; bookingId: string }> };

/** One receipt (the simplified tax invoice of a paid booking or order): GET /billing/invoice/:kind/:id, drawn as the thermal receipt. */
export default async function ReceiptPage({ params }: Props) {
  const { locale, kind, bookingId } = await params;
  if (!isLocale(locale) || !isReceiptKind(kind)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Receipt");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const response = await getInvoice(token, kind, bookingId);
  if (response.status === 401) redirect(`/${locale}/login`);
  const receipt = response.ok ? extractReceipt(await response.json().catch(() => null)) : null;
  if (!receipt) {
    // the backend issues an invoice only for a paid booking: a 400 here means "not paid yet", anything else is a failed read
    const unpaid = response.status === 400;
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/receipts`}>
        {unpaid ? (
          <ConsultState kind="empty" title={t("notPaidTitle")} body={t("notPaidBody")} actionLabel={t("listTitle")} actionHref={`/${locale}/receipts`} />
        ) : (
          <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={rs("retry")} />
        )}
      </ConsultPage>
    );
  }
  const labels = receiptLabels((key, values) => t(key, values), receipt, (percent) => formatNumber(locale, percent));
  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/receipts`}>
      <ReceiptPaper locale={locale} receipt={receipt} labels={labels} actions={<ReceiptActions locale={locale} kind={kind} bookingId={bookingId} invoiceNo={receipt.invoiceNo} labels={labels} />} />
    </ConsultPage>
  );
}
