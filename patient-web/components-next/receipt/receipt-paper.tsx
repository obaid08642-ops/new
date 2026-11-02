import { NabdMark } from "@/components-next/nabd-mark";
import { qrPath } from "@/lib/health/qr";
import { formatDate } from "@/lib/format-date";
import { formatPrice } from "@/lib/format-price";
import type { ReceiptView } from "@/lib/receipt/model";
import { ReceiptShare } from "./receipt-share";
import styles from "./receipt.module.css";

export type ReceiptLabels = Readonly<{
  region: string; simplified: string; paymentReceipt: string; totalPaid: string; invoiceNo: string; vatNumber: string; dateTime: string; subtotal: string; vat: string; total: string;
  qr: string; downloadPdf: string; share: string; shareTitle: string; brand: string;
}>;

/**
 * The simplified tax invoice as a thermal receipt: the paper slides out of a printer slot (CSS only, under 1 s; shown at once
 * under prefers-reduced-motion), then Download PDF and Share appear. Seller, VAT number and time come from the signed QR;
 * the amounts are the invoice's own. Rows the backend does not send (lines, payment method, insured split) are not drawn.
 */
export function ReceiptPaper({ locale, receipt, labels, pdfHref, pageHref }: Readonly<{ locale: string; receipt: ReceiptView; labels: ReceiptLabels; pdfHref: string; pageHref: string }>) {
  const qr = receipt.qr ? qrPath(receipt.qr) : null;
  // model A: the platform's VAT is only the VAT inside the delivery fee; with none, there is no VAT row
  const showVat = receipt.taxInvoice && receipt.vatAmount > 0;
  const money = (value: number) => formatPrice(locale, value).text;
  const when = formatDate(locale, receipt.issuedAt, { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className={styles.stage} aria-label={labels.region}>
      <div className={styles.slot} aria-hidden="true" />
      <div className={styles.window}>
        <article className={styles.paper}>
          <header className={styles.head}>
            <NabdMark size={40} />
            <p className={styles.seller}>{receipt.seller?.seller ?? receipt.sellerName ?? labels.brand}</p>
            <p className={styles.kind}>{receipt.taxInvoice ? labels.simplified : labels.paymentReceipt}</p>
          </header>
          <dl className={styles.meta}>
            {receipt.seller ? (<><dt>{labels.vatNumber}</dt><dd><bdi>{receipt.seller.vatNumber}</bdi></dd></>) : null}
            <dt>{labels.invoiceNo}</dt><dd><bdi>{receipt.invoiceNo}</bdi></dd>
            {when ? (<><dt>{labels.dateTime}</dt><dd><bdi>{when}</bdi></dd></>) : null}
          </dl>
          <dl className={`${styles.meta} ${styles.sums}`}>
            {showVat ? (<><dt>{labels.subtotal}</dt><dd><bdi>{money(receipt.subtotal)}</bdi></dd></>) : null}
            {showVat ? (<><dt>{labels.vat}</dt><dd><bdi>{money(receipt.vatAmount)}</bdi></dd></>) : null}
            <dt className={styles.totalLabel}>{receipt.taxInvoice ? labels.total : labels.totalPaid}</dt><dd className={styles.totalValue}><bdi>{money(receipt.total)}</bdi></dd>
          </dl>
          {qr ? (
            <svg className={styles.qr} viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label={labels.qr} shapeRendering="crispEdges">
              <path d={qr.path} fill="currentColor" />
            </svg>
          ) : null}
        </article>
      </div>
      <div className={styles.actions}>
        <a href={pdfHref} download className="nabd-button nabd-button--primary nabd-button--lg"><span className="nabd-button__label">{labels.downloadPdf}</span></a>
        <ReceiptShare label={labels.share} title={labels.shareTitle} pdfHref={pdfHref} fileName={`${receipt.invoiceNo}.pdf`} pageHref={pageHref} />
      </div>
    </section>
  );
}
