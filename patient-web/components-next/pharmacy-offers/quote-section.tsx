import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buildFinalQuoteAcceptanceRequest } from "@/lib/api/pharmacy-actions";
import { quoteToAccept, type PatientPharmacyOrderProgress, type PatientPharmacyQuote } from "@/lib/api/pharmacy-offers";
import { formatMoney } from "./format";
import { OnlinePaymentActions } from "./payment-actions";
import { QuoteActions } from "./quote-actions";
import styles from "./offers.module.css";

/** The server's own numbers of a quote: items, delivery and total, each only when the server sent it. */
type Translate = Awaited<ReturnType<typeof getTranslations<"PharmacyOffers">>>;

function QuoteTotals({ locale, quote, t }: { locale: string; quote: PatientPharmacyQuote; t: Translate }) {
  if (quote.total === undefined) return null;
  return (
    <>
      <div className={styles.priceBox}>
        <span className={styles.priceLabel}>{t("quotePriceLabel")}</span>
        <span className={styles.price}>{formatMoney(locale, quote.total, quote.currency)}</span>
      </div>
      {quote.subtotal !== undefined || quote.deliveryFee !== undefined ? (
        <dl className={styles.sums}>
          {quote.subtotal !== undefined ? <div className={styles.sum}><dt>{t("subtotalLabel")}</dt><dd>{formatMoney(locale, quote.subtotal, quote.currency)}</dd></div> : null}
          {quote.deliveryFee !== undefined ? <div className={styles.sum}><dt>{t("deliveryLabel")}</dt><dd>{formatMoney(locale, quote.deliveryFee, quote.currency)}</dd></div> : null}
        </dl>
      ) : null}
    </>
  );
}

type Props = {
  locale: string;
  orderId: string;
  progress: PatientPharmacyOrderProgress;
  /** `offers` is the order's offers page (it also draws the online payment methods); `final` is the final-price screen. */
  screen: "offers" | "final";
};

/**
 * The selected offer's final price and what can be done with it, from the order's own governed state:
 *   OFFER_SELECTED / FINAL_QUOTE_READY  -> accept the price (hash and revision the server sent);
 *   FINAL_QUOTE_ACCEPTED                -> cash on delivery when the server allows it, else payment;
 *   COD_REGISTERED                      -> registered (a commitment, not a payment).
 * Nothing is computed here: the numbers are the snapshot's.
 */
export async function QuoteSection({ locale, orderId, progress, screen }: Props) {
  const t = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const state = progress.governedState ?? "";
  const quote = quoteToAccept(progress) ?? (progress.acceptedQuoteTotal !== undefined ? { total: progress.acceptedQuoteTotal } : undefined);
  const trackingHref = `/${locale}/orders/${encodeURIComponent(orderId)}/tracking`;
  const request = buildFinalQuoteAcceptanceRequest(orderId, quote?.hash, quote?.revision);
  const canAccept = ["OFFER_SELECTED", "FINAL_QUOTE_READY"].includes(state) && request !== null && quote?.total !== undefined;
  const canCod = state === "FINAL_QUOTE_ACCEPTED" && progress.coverageMode === "cash" && progress.codAllowed === true;

  if (!canAccept && state !== "FINAL_QUOTE_ACCEPTED" && state !== "COD_REGISTERED") {
    return (
      <section className={styles.panel} aria-labelledby="quote-none">
        <h2 className={styles.panelTitle} id="quote-none">{t("quoteNone")}</h2>
        <Link href={`/${locale}/orders/${encodeURIComponent(orderId)}`} className={`nabd-button nabd-button--secondary nabd-button--lg nabd-button--full ${styles.linkButton}`}>
          <span className="nabd-button__label">{t("orderStatusLink")}</span>
        </Link>
      </section>
    );
  }

  return (
    <>
      {state === "FINAL_QUOTE_ACCEPTED" ? (
        <p className={`${styles.notice} ${styles.noticeOk}`} role="status"><span><strong>{t("quoteAcceptedTitle")}</strong> {t("quoteAcceptedBody")}</span></p>
      ) : null}
      {state === "COD_REGISTERED" ? <p className={`${styles.notice} ${styles.noticeOk}`} role="status">{t("codRegistered")}</p> : null}
      <section className={styles.panel} aria-labelledby="quote-title">
        <h2 className={styles.panelTitle} id="quote-title">{t("quoteTitle")}</h2>
        {canAccept ? <p className={styles.note}>{t("quoteLead")}</p> : null}
        {quote ? <QuoteTotals locale={locale} quote={quote} t={t} /> : null}
        {canAccept ? <QuoteActions orderId={orderId} quoteHash={quote?.hash} quoteRevision={quote?.revision} canAccept canRegisterCod={false} afterCod="refresh" /> : null}
      </section>
      {canCod ? (
        <section className={styles.panel} aria-labelledby="cod-title">
          <h2 className={styles.panelTitle} id="cod-title">{t("codTitle")}</h2>
          <p className={styles.note}>{t("codBody")}</p>
          <QuoteActions orderId={orderId} canAccept={false} canRegisterCod afterCod={screen === "final" ? "tracking" : "refresh"} />
        </section>
      ) : null}
      {state === "FINAL_QUOTE_ACCEPTED" ? (
        screen === "offers" ? <OnlinePaymentActions orderId={orderId} /> : (
          <Link href={`/${locale}/pharmacy/payment?orderId=${encodeURIComponent(orderId)}`} className={`nabd-button nabd-button--primary nabd-button--lg nabd-button--full ${styles.linkButton}`}>
            <span className="nabd-button__label">{t("continuePayment")}</span>
          </Link>
        )
      ) : null}
      {state === "COD_REGISTERED" ? (
        <Link href={trackingHref} className={`nabd-button nabd-button--primary nabd-button--lg nabd-button--full ${styles.linkButton}`}>
          <span className="nabd-button__label">{t("trackOrder")}</span>
        </Link>
      ) : null}
    </>
  );
}
