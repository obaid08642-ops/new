import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoreShell } from "@/components-next/core/core-shell";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { RetryLinkErrorState } from "@/components-next/pharmacy-checkout/state-views";
import { formatMoney } from "@/components-next/pharmacy-offers/format";
import { LocalDate } from "./local-date";
import { statusKey } from "@/components-next/pharmacy-offers/status";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { parseOrderId } from "@/lib/api/orders";
import { requirePatientAccess } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n";
import { orderAction, orderNumber } from "@/lib/pharmacy/order-view";
import { routeForOrder } from "@/lib/pharmacy/order-route";
import { readOrderDetail } from "./read-orders";
import { statusTone } from "./status-tone";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./orders.module.css";

/**
 * `/orders/:id`: one order of the patient's. It says where the order stands (the server's status), what is in it, where
 * it goes, the price the server stored for the selected offer, and the one thing to do next: the order router sends an
 * order that is still being arranged to the step it is at (offers, final price, payment, insurance), a fulfilled one to
 * its tracking, a finished one can be ordered again.
 */
export async function OrderDetailScreen({ locale, orderId }: { locale: Locale; orderId: string }) {
  if (!parseOrderId(orderId).success) notFound();
  const t = await getTranslations({ locale, namespace: "Orders" });
  const offers = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const ordersHref = `/${locale}/orders`;
  const frame = (children: React.ReactNode) => (
    <CoreShell locale={locale} title={t("detailTitle")} backHref={ordersHref} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("detailTitle")}</h1></div>
        {children}
      </div>
    </CoreShell>
  );

  const order = await readOrderDetail(locale, orderId, token);
  if (!order.ok) {
    return frame(<div className={rx.state}><RetryLinkErrorState title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={routeState("retry")} actionLabel={t("backToOrders")} actionHref={ordersHref} /></div>);
  }
  const { detail } = order;
  const action = orderAction(detail.status);
  const encoded = encodeURIComponent(orderId);
  const next = routeForOrder({ status: detail.status, governedState: detail.governedState, paymentStatus: detail.paymentStatus }, orderId, locale);
  const tracking = `/${locale}/orders/${encoded}/tracking`;
  const reorder = `/${locale}/pharmacy/reorder?orderId=${encoded}`;
  const addressParts = [detail.address?.label, detail.address?.street, detail.address?.district, detail.address?.city].filter((part): part is string => Boolean(part));
  const addressLine = addressParts.length ? new Intl.ListFormat(locale, { type: "unit", style: "short" }).format(addressParts) : undefined;

  return frame(
    <>
      <section className={rx.card} aria-label={t("detailTitle")}>
        <div className={styles.hero}>
          <FIcon icon="pill" tone={PHARMACY_TONE} size={44} />
          <div className={styles.heroText}>
            <h2 className={rx.rowTitle}>{t("pharmacyOrder")}</h2>
            <span className={styles.orderMeta}>
              <bdi>{t("orderRef", { number: orderNumber(detail.id) })}</bdi>
              {detail.createdAt ? <> · <LocalDate iso={detail.createdAt} locale={locale} /></> : null}
            </span>
          </div>
        </div>
        <div className={styles.chips}>
          <StatusChip label={offers(`status.${statusKey(detail.status)}`)} tone={statusTone(detail.status)} />
          {detail.paymentStatus === "paid" ? <StatusChip label={t("paid")} tone={OFFER_TONES.good} /> : null}
          {detail.paymentStatus === "covered_by_insurance" ? <StatusChip label={t("covered")} tone={OFFER_TONES.info} /> : null}
          {detail.coverageMode === "insurance" && detail.paymentStatus !== "covered_by_insurance" ? <StatusChip label={t("coverageInsurance")} tone={OFFER_TONES.info} /> : null}
        </div>
      </section>

      {detail.lines.length > 0 ? (
        <section className={`${rx.card} ${styles.section}`} aria-labelledby="order-items">
          <h2 className={styles.sectionTitle} id="order-items">{t("itemsTitle")}</h2>
          <ul className={styles.lines}>
            {detail.lines.map((line) => (
              <li className={styles.line} key={line.id}>
                <span className={styles.lineName}>{line.name}</span>
                <span className={styles.lineQty}>{offers("lineQty", { qty: line.qty })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {detail.fulfillment === "pickup" || addressLine ? (
        <section className={`${rx.card} ${styles.section}`} aria-labelledby="order-delivery">
          <h2 className={styles.sectionTitle} id="order-delivery">{detail.fulfillment === "pickup" ? t("pickupTitle") : t("deliveryTitle")}</h2>
          {detail.fulfillment === "pickup" ? <p className={rx.note}>{t("pickupNote")}</p> : addressLine ? <p className={styles.address}>{addressLine}</p> : null}
        </section>
      ) : null}

      {detail.totals ? (
        <section className={`${rx.card} ${styles.section}`} aria-labelledby="order-price">
          <h2 className={styles.sectionTitle} id="order-price">{t("priceTitle")}</h2>
          <dl className={styles.rows}>
            {detail.totals.subtotal !== undefined ? <div className={styles.row}><dt>{offers("subtotalLabel")}</dt><dd>{formatMoney(locale, detail.totals.subtotal, detail.totals.currency)}</dd></div> : null}
            {detail.totals.deliveryFee !== undefined ? <div className={styles.row}><dt>{offers("deliveryLabel")}</dt><dd>{formatMoney(locale, detail.totals.deliveryFee, detail.totals.currency)}</dd></div> : null}
            <div className={`${styles.row} ${styles.rowTotal}`}><dt>{t("total")}</dt><dd>{formatMoney(locale, detail.totals.total, detail.totals.currency)}</dd></div>
          </dl>
        </section>
      ) : null}

      <div className={styles.actions}>
        {action === "reorder" ? (
          <>
            <ButtonLink href={reorder} label={t("action.reorder")} fullWidth />
            <ButtonLink href={tracking} label={t("action.track")} variant="outline" fullWidth />
          </>
        ) : action === "details" ? (
          <ButtonLink href={reorder} label={t("action.reorder")} variant="outline" fullWidth />
        ) : (
          <ButtonLink href={next} label={next === tracking ? t("action.track") : t("action.continue")} fullWidth />
        )}
      </div>
    </>,
  );
}
