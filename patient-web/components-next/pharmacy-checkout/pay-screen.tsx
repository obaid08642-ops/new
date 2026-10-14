"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CoreShell } from "@/components-next/core/core-shell";
import { StickyFooter } from "@/components-next/ui-generated/shells";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Radio } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { formatMoney } from "@/components-next/pharmacy-offers/format";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import { usePharmacyAction } from "@/components-next/pharmacy-offers/use-pharmacy-action";
import { checkoutUrlOf, isTrustedCheckoutUrl, transactionIdOf } from "@/lib/api/pharmacy-payment";
import type { Locale } from "@/lib/i18n";
import { rememberPayment } from "@/lib/pharmacy/payment-return";
import type { PaymentMethodId } from "@/lib/pharmacy/payment-state";
import rx from "@/components-next/pharmacy/rx.module.css";
import ov from "@/components-next/pharmacy-offers/offers.module.css";
import styles from "./checkout.module.css";

const METHOD_KEY = { card: "methodCard", "apple-pay": "methodApplePay", "google-pay": "methodGooglePay" } as const satisfies Record<PaymentMethodId, string>;

export type PayScreenProps = {
  locale: Locale;
  orderId: string;
  /** The server's amount due and the methods it offers (GET /payments/pharmacy/:id/capabilities). */
  amount: number;
  currency: string;
  methods: PaymentMethodId[];
  coverage: "cash" | "insurance";
  /** The accepted price, as the server's snapshot states it. Each line is drawn only when the server sent it. */
  totals?: { subtotal?: number; deliveryFee?: number; total?: number };
  insurerShare?: number;
  address?: string;
};

/**
 * The payment step (canvas/CheckoutV2): where the order goes, how it is paid, what is due, and one pay button.
 * The amount is the server's; no card detail is asked for here: the button asks the server for a payment, and the
 * patient enters the card on the payment provider's own secure page. A second press while a request runs does nothing,
 * and the same idempotency key is reused until the server has answered.
 */
export function PayScreen({ locale, orderId, amount, currency, methods, coverage, totals, insurerShare, address }: PayScreenProps) {
  const t = useTranslations("PharmacyCheckout");
  const offers = useTranslations("PharmacyOffers");
  const addressT = useTranslations("PharmacyAddress");
  const router = useRouter();
  const action = usePharmacyAction();
  const { reset } = action;
  const [method, setMethod] = useState<PaymentMethodId>(methods[0]);
  const [handoff, setHandoff] = useState<"going" | "none" | null>(null);

  // coming back from the provider's page with the Back button restores this page from memory: it must be usable again
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setHandoff(null);
      reset();
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, [reset]);

  async function pay() {
    if (action.pending || handoff === "going") return;
    setHandoff(null);
    const result = await action.run(`pay:${method}`, `/api/payments/pharmacy/${encodeURIComponent(orderId)}/intent`, { method });
    if (!result) return;
    if (!result.ok) {
      // another tab or the provider's callback may have settled it already: show what the server says now
      if (result.kind === "alreadyPaid") router.refresh();
      return;
    }
    const url = checkoutUrlOf(result.data);
    if (isTrustedCheckoutUrl(url)) {
      const transactionId = transactionIdOf(result.data);
      if (transactionId) rememberPayment({ orderId, transactionId });
      setHandoff("going");
      window.location.assign(url);
      return;
    }
    // the server answered but named no secure page: nothing was paid and nothing is claimed
    setHandoff("none");
  }

  const due = formatMoney(locale, amount, currency);
  const busy = action.pending || handoff === "going";
  const payButton = <Button label={busy ? t("paying") : t("payNow", { amount: due })} size="lg" fullWidth loading={busy} disabled={busy} onClick={() => void pay()} />;
  const orderHref = `/${locale}/orders/${encodeURIComponent(orderId)}`;

  return (
    <CoreShell
      locale={locale}
      title={t("paymentTitle")}
      backHref={orderHref}
      hideTabs
      width="narrow"
      footer={<StickyFooter label={t("paymentTitle")}><div className={rx.bar}>{payButton}</div></StickyFooter>}
    >
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("paymentTitle")}</h1></div>

        {address ? (
          <section className={rx.card} aria-label={addressT("deliverTo")}>
            <div className={rx.cardRow}>
              <FIcon icon="map-pin" tone={PHARMACY_TONE} size={44} />
              <div className={rx.cardBody}>
                <span className={rx.cardLabel}>{addressT("deliverTo")}</span>
                <span className={rx.cardValue} dir="auto">{address}</span>
              </div>
            </div>
          </section>
        ) : null}

        {coverage === "insurance" ? (
          <section className={rx.card} aria-labelledby="pay-how">
            <div className={rx.cardRow}>
              <FIcon icon="shield-check" tone={OFFER_TONES.info} size={44} />
              <div className={rx.cardBody}>
                <h2 className={rx.h2} id="pay-how">{t("howInsurance")}</h2>
                <span className={rx.cardLabel}>{t("howInsuranceBody")}</span>
              </div>
            </div>
          </section>
        ) : null}

        <h2 className={styles.legend} id="pay-method">{t("methodsLegend")}</h2>
        <div className={`${rx.card} ${styles.methods}`} role="radiogroup" aria-labelledby="pay-method">
          {methods.map((id, index) => (
            <Radio key={id} label={offers(METHOD_KEY[id])} selected={method === id} onChange={() => setMethod(id)} divider={index < methods.length - 1} disabled={busy} />
          ))}
        </div>

        <section className={rx.card} aria-label={t("amountsTitle")}>
          <dl className={styles.rows}>
            {coverage === "insurance" ? (
              <>
                {totals?.total !== undefined ? <div className={styles.row}><dt>{t("rowTotal")}</dt><dd>{formatMoney(locale, totals.total, currency)}</dd></div> : null}
                {insurerShare !== undefined ? <div className={`${styles.row} ${styles.rowCovered}`}><dt>{t("rowCovered")}</dt><dd>{formatMoney(locale, insurerShare, currency)}</dd></div> : null}
              </>
            ) : (
              <>
                {totals?.subtotal !== undefined ? <div className={styles.row}><dt>{t("rowItems")}</dt><dd>{formatMoney(locale, totals.subtotal, currency)}</dd></div> : null}
                {totals?.deliveryFee !== undefined ? <div className={styles.row}><dt>{t("rowDelivery")}</dt><dd>{formatMoney(locale, totals.deliveryFee, currency)}</dd></div> : null}
              </>
            )}
            <hr className={styles.rowDivider} />
            <div className={`${styles.row} ${styles.rowTotal}`}><dt>{coverage === "insurance" ? t("rowShare") : t("rowDue")}</dt><dd>{due}</dd></div>
          </dl>
        </section>

        <p className={styles.secure}>{t("secureNote")}</p>

        {action.error ? <p className={ov.errorText} role="alert">{action.error === "generic" ? offers("paymentError") : offers(`errors.${action.error}`)}</p> : null}
        {handoff === "going" ? <p className={ov.okText} role="status">{offers("redirecting")}</p> : null}
        {handoff === "none" ? <p className={ov.errorText} role="alert">{offers("noRedirect")}</p> : null}

        <div className={rx.deskActions}>{payButton}</div>
      </div>
    </CoreShell>
  );
}
