import { ReceiptImage } from "./receipt-image";
import { ReceiptLinks } from "./receipt-links";
import { ReceiptShare } from "./receipt-share";
import type { ReceiptLabels } from "@/lib/receipt/labels";
import type { ReceiptKind } from "@/lib/receipt/model";

/** Download PDF, Save as image, Share (system sheet) and the share-link panel under the receipt of the signed-in patient. */
export function ReceiptActions({ locale, kind, bookingId, invoiceNo, labels }: Readonly<{ locale: string; kind: ReceiptKind; bookingId: string; invoiceNo: string; labels: ReceiptLabels }>) {
  const pdfHref = `/api/patient/billing/invoice/${kind}/${encodeURIComponent(bookingId)}/pdf`;
  return (
    <>
      <a href={pdfHref} download className="nabd-button nabd-button--primary nabd-button--lg"><span className="nabd-button__label">{labels.downloadPdf}</span></a>
      <ReceiptImage label={labels.saveImage} failed={labels.saveImageFailed} fileName={`${invoiceNo}.png`} />
      <ReceiptShare label={labels.share} title={labels.shareTitle} pdfHref={pdfHref} fileName={`${invoiceNo}.pdf`} pageHref={`/${locale}/receipts/${kind}/${encodeURIComponent(bookingId)}`} />
      <ReceiptLinks locale={locale} kind={kind} bookingId={bookingId} labels={labels} />
    </>
  );
}
