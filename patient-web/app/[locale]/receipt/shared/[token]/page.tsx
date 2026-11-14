import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSharedInvoice, isShareToken } from "@/lib/api/billing-server";
import { formatDate } from "@/lib/format-date";
import { formatNumber } from "@/lib/format-price";
import { isLocale } from "@/lib/i18n";
import { receiptLabels } from "@/lib/receipt/labels";
import { extractReceipt } from "@/lib/receipt/model";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ReceiptImage } from "@/components-next/receipt/receipt-image";
import { ReceiptPaper } from "@/components-next/receipt/receipt-paper";
import styles from "@/components-next/receipt/receipt.module.css";

type Props = { params: Promise<{ locale: string; token: string }> };

// A shared receipt is never cached and never indexed; the link is the only credential, so the page also sends no referrer.
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: isLocale(locale) ? locale : "en", namespace: "Receipt" });
  return { title: t("sharedTitle"), robots: { index: false, follow: false, noarchive: true, nocache: true }, referrer: "no-referrer" };
}

/** What a share link opens: the receipt, read-only, with no sign-in and none of the account's data (GET /billing/shared/:token). */
export default async function SharedReceiptPage({ params }: Props) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Receipt");
  const rs = await getTranslations("RouteState");
  // one answer for an unknown, expired or revoked link, as the backend gives
  if (!isShareToken(token)) return <GonePage title={t("sharedGoneTitle")} body={t("sharedGoneBody")} />;
  const response = await getSharedInvoice(token);
  if (response.status === 404 || response.status === 429) return <GonePage title={t("sharedGoneTitle")} body={t("sharedGoneBody")} />;
  const json = response.ok ? await response.json().catch(() => null) : null;
  const receipt = extractReceipt(json, { shared: true });
  if (!receipt) {
    return (
      <main className={styles.sharedMain}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={rs("retry")} />
      </main>
    );
  }
  const expires = formatDate(locale, typeof json?.shared?.expires_at === "string" ? json.shared.expires_at : null, { dateStyle: "medium" });
  const labels = receiptLabels((key, values) => t(key, values), receipt, (percent) => formatNumber(locale, percent));
  return (
    <main className={styles.sharedMain}>
      <h1 className={styles.panelTitle}>{t("sharedTitle")}</h1>
      <p className={styles.sharedNote}>{t("sharedNote")}{expires ? ` ${t("sharedExpires", { date: expires })}` : ""}</p>
      <ReceiptPaper
        locale={locale}
        receipt={receipt}
        labels={labels}
        actions={(
          <>
            <a href={`/api/receipt-shared/${encodeURIComponent(token)}/pdf`} download className="nabd-button nabd-button--primary nabd-button--lg"><span className="nabd-button__label">{labels.downloadPdf}</span></a>
            <ReceiptImage label={labels.saveImage} failed={labels.saveImageFailed} fileName={`${receipt.invoiceNo}.png`} />
          </>
        )}
      />
    </main>
  );
}

function GonePage({ title, body }: { title: string; body: string }) {
  return (
    <main className={styles.sharedMain}>
      <ConsultState kind="empty" title={title} body={body} />
    </main>
  );
}
