import type { ReactNode } from "react";
import { NabdMark } from "@/components-next/nabd-mark";
import { qrPath } from "@/lib/health/qr";
import { formatDate } from "@/lib/format-date";
import { formatPrice } from "@/lib/format-price";
import { providerTypeKey, type ReceiptLabels } from "@/lib/receipt/labels";
import { providerName, type ReceiptView } from "@/lib/receipt/model";
import styles from "./receipt.module.css";

export type { ReceiptLabels } from "@/lib/receipt/labels";

const STATE_KEY = { paid: "statePaid", partially_refunded: "statePartial", refunded: "stateRefunded" } as const;

/**
 * The simplified tax invoice as a thermal receipt, top to bottom: our company (the issuer), the invoice details, the service provider
 * (who delivered the service), the amounts, the credit notes, the ZATCA QR. A value the owner has not configured says so; a value the
 * backend did not send is not drawn (nothing is invented).
 */
export function ReceiptCard({ locale, receipt, labels }: Readonly<{ locale: string; receipt: ReceiptView; labels: ReceiptLabels }>) {
  const qr = receipt.qr ? qrPath(receipt.qr) : null;
  const money = (value: number) => formatPrice(locale, value).text;
  const when = formatDate(locale, receipt.issuedAt, { dateStyle: "medium", timeStyle: "short" });
  const credit = receipt.type === "credit_note";
  const { company, provider } = receipt;
  const stateKey = receipt.state && receipt.state in STATE_KEY ? STATE_KEY[receipt.state as keyof typeof STATE_KEY] : null;
  const typeKey = provider ? providerTypeKey(provider.type) : null;
  const dash = (value: string | null) => (value ? <bdi>{value}</bdi> : <span className={styles.notConfigured}>{labels.notConfigured}</span>);
  return (
    <article className={styles.paper} data-receipt-card>
      <header className={styles.head}>
        <NabdMark size={40} />
        <p className={styles.seller}>{company.legalName ?? labels.brand}</p>
        <p className={styles.kind}>{credit ? labels.creditNoteTitle : labels.simplified}</p>
      </header>
      <section aria-label={labels.issuedBy}>
        <dl className={styles.meta}>
          <dt>{labels.vatNumber}</dt><dd>{dash(company.vatNumber)}</dd>
          <dt>{labels.crNumber}</dt><dd>{dash(company.crNumber)}</dd>
          <dt>{labels.address}</dt><dd>{dash(company.address)}</dd>
        </dl>
      </section>
      <dl className={styles.meta}>
        <dt>{labels.invoiceNo}</dt><dd><bdi>{receipt.invoiceNo}</bdi></dd>
        {receipt.bookingRef ? (<><dt>{labels.bookingNo}</dt><dd><bdi>{receipt.bookingRef}</bdi></dd></>) : null}
        {when ? (<><dt>{labels.dateTime}</dt><dd><bdi>{when}</bdi></dd></>) : null}
        {stateKey ? (<><dt>{labels.status}</dt><dd className={receipt.state === "paid" ? undefined : styles.stateRefund}>{labels[stateKey]}</dd></>) : null}
      </dl>
      {provider ? (
        <section aria-label={labels.providerHeading}>
          <dl className={styles.meta}>
            <dt className={styles.sectionLabel}>{labels.providerHeading}</dt><dd />
            <dt>{labels.providerName}</dt><dd><bdi>{providerName(provider, locale)}</bdi></dd>
            {typeKey ? (<><dt>{labels.providerType}</dt><dd>{labels[typeKey]}</dd></>) : null}
            {provider.licence ? (<><dt>{labels.licence}</dt><dd><bdi>{provider.licence}</bdi></dd></>) : null}
          </dl>
        </section>
      ) : null}
      <dl className={`${styles.meta} ${styles.sums}`}>
        <dt>{labels.subtotal}</dt><dd><bdi>{money(receipt.subtotal)}</bdi></dd>
        <dt>{labels.vat}</dt><dd><bdi>{money(receipt.vatAmount)}</bdi></dd>
        <dt className={styles.totalLabel}>{labels.total}</dt><dd className={styles.totalValue}><bdi>{money(receipt.total)}</bdi></dd>
      </dl>
      {receipt.creditNotes.length > 0 ? (
        <dl className={styles.meta}>
          {receipt.creditNotes.map((note) => (
            <div key={note.invoiceNo} className={styles.noteRow}>
              <dt>{labels.creditNoteRow.replace("{no}", note.invoiceNo)}</dt><dd><bdi>{money(note.total)}</bdi></dd>
            </div>
          ))}
          <dt>{labels.refunded}</dt><dd className={styles.stateRefund}><bdi>{money(receipt.refundedTotal)}</bdi></dd>
        </dl>
      ) : null}
      {qr ? (
        <svg className={styles.qr} viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label={labels.qr} shapeRendering="crispEdges">
          <path d={qr.path} fill="currentColor" />
        </svg>
      ) : null}
    </article>
  );
}

/** The paper sliding out of the printer slot (CSS only, under 1 s; shown at once under prefers-reduced-motion), then the actions appear. */
export function ReceiptPaper({ locale, receipt, labels, actions }: Readonly<{ locale: string; receipt: ReceiptView; labels: ReceiptLabels; actions: ReactNode }>) {
  return (
    <section className={styles.stage} aria-label={labels.region}>
      <div className={styles.slot} aria-hidden="true" />
      <div className={styles.window}>
        <ReceiptCard locale={locale} receipt={receipt} labels={labels} />
      </div>
      <div className={styles.actions}>{actions}</div>
    </section>
  );
}
