import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMyInvoices } from "@/lib/api/billing-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { formatPrice } from "@/lib/format-price";
import { isLocale } from "@/lib/i18n";
import { extractReceipts, isReceiptKind } from "@/lib/receipt/model";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import styles from "@/components-next/receipt/receipt.module.css";

type Props = { params: Promise<{ locale: string }> };

const KIND_KEY: Record<string, string> = {
  pharmacy: "kindPharmacy", order: "kindPharmacy", appointment: "kindConsultation", consultation: "kindConsultation",
  lab: "kindLab", radiology: "kindRadiology", home_care: "kindNursing", nursing: "kindNursing",
};

/** Receipts: the patient's invoices, newest first (GET /billing/my), each opening its receipt. */
export default async function ReceiptsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Receipt");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const response = await getMyInvoices(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("listTitle")} backHref={`/${locale}/profile`}>
        <ConsultState kind="error" title={t("listUnavailableTitle")} body={t("listUnavailableBody")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const receipts = extractReceipts(await response.json().catch(() => null)).filter((r) => isReceiptKind(r.kind));
  return (
    <ConsultPage locale={locale} title={t("listTitle")} backHref={`/${locale}/profile`}>
      {receipts.length === 0 ? (
        <ConsultState kind="empty" title={t("listEmptyTitle")} body={t("listEmptyBody")} />
      ) : (
        <ul className={styles.list}>
          {receipts.map((r) => (
            <li key={r.invoiceNo}>
              <Link className={styles.row} href={`/${locale}/receipts/${r.kind}/${encodeURIComponent(r.bookingId)}`}>
                <span className={styles.rowTitle}>{t(KIND_KEY[r.kind] ?? "kindPharmacy")}</span>
                <span className={styles.rowTotal}><bdi>{formatPrice(locale, r.total).text}</bdi></span>
                <span className={styles.rowSub}><bdi>{r.invoiceNo}</bdi> · <bdi>{formatDate(locale, r.issuedAt) ?? ""}</bdi></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ConsultPage>
  );
}
