import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getInvoice } from "@/lib/api/billing-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatNumber } from "@/lib/format-price";
import { isLocale } from "@/lib/i18n";
import { extractReceipt, isReceiptKind } from "@/lib/receipt/model";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ReceiptPaper } from "@/components-next/receipt/receipt-paper";

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
  const pdfHref = `/api/patient/billing/invoice/${kind}/${encodeURIComponent(bookingId)}/pdf`;
  const labels = {
    region: t("title"), simplified: t("simplified"), paymentReceipt: t("paymentReceipt"), totalPaid: t("totalPaid"), invoiceNo: t("invoiceNo"), vatNumber: t("vatNumber"), dateTime: t("dateTime"),
    subtotal: t("subtotal"), vat: t("vat", { rate: formatNumber(locale, Math.round(receipt.vatRate * 100)) }), total: t("total"), qr: t("qr"), downloadPdf: t("downloadPdf"),
    share: t("share"), shareTitle: t("shareTitle", { no: receipt.invoiceNo }), brand: t("brand"),
  };
  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/receipts`}>
      <ReceiptPaper locale={locale} receipt={receipt} labels={labels} pdfHref={pdfHref} pageHref={`/${locale}/receipts/${kind}/${encodeURIComponent(bookingId)}`} />
    </ConsultPage>
  );
}
