import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoreShell } from "@/components-next/core/core-shell";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { CancelOrder } from "@/components-next/pharmacy-offers/cancel-order";
import { routeForOrder } from "@/lib/pharmacy/order-route";
import { RetryLinkErrorState } from "@/components-next/pharmacy-checkout/state-views";
import { formatMoney } from "@/components-next/pharmacy-offers/format";
import { LocalArrival } from "./local-date";
import { statusKey } from "@/components-next/pharmacy-offers/status";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { parseOrderId } from "@/lib/api/orders";
import { requirePatientAccess } from "@/lib/auth/session";
import { getDirection, type Locale } from "@/lib/i18n";
import { canCancelOrder, dialable, isMoving, orderNumber, pharmacyDisplayName, trackingSteps } from "@/lib/pharmacy/order-view";
import { readOrderDetail } from "./read-orders";
import { TrackingRefresh } from "./tracking-refresh";
import { TrackingTimeline } from "./tracking-timeline";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./orders.module.css";

/**
 * `/orders/:id/tracking` (canvas/OrderTracking). Everything is read from the order the backend returns
 * (GET /patient/pharmacy/orders/:id): its status, the steps the server logged, the courier and arrival time the pharmacy
 * entered when it dispatched. The board's live map is not drawn: the API sends no courier position for a pharmacy order.
 * A part the API did not send (the arrival time, the courier, a step's time) is left out, never filled in.
 */
export async function TrackingScreen({ locale, orderId }: { locale: Locale; orderId: string }) {
  if (!parseOrderId(orderId).success) notFound();
  const t = await getTranslations({ locale, namespace: "OrderTracking" });
  const orders = await getTranslations({ locale, namespace: "Orders" });
  const offers = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const orderHref = `/${locale}/orders/${encodeURIComponent(orderId)}`;
  const frame = (children: React.ReactNode) => (
    <CoreShell locale={locale} title={t("title")} backHref={orderHref} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>
        {children}
      </div>
    </CoreShell>
  );

  const order = await readOrderDetail(locale, orderId, token);
  if (!order.ok) {
    return frame(<div className={rx.state}><RetryLinkErrorState title={orders("unavailableTitle")} body={orders("unavailableBody")} retryLabel={routeState("retry")} actionLabel={orders("backToOrders")} actionHref={`/${locale}/orders`} /></div>);
  }
  const { detail } = order;
  const status = (detail.status ?? "").toLowerCase();
  const steps = trackingSteps(detail);
  const moving = isMoving(detail.status);
  const started = steps.some((step) => step.state !== "upcoming");
  const eta = moving && detail.courier?.eta ? detail.courier.eta : undefined;
  const phone = dialable(detail.courier?.phone);
  const pharmacyName = pharmacyDisplayName(detail.pharmacyName, locale);
  const summary = [detail.lines.length > 0 ? orders("itemsCount", { count: detail.lines.length }) : undefined, detail.totals ? formatMoney(locale, detail.totals.total, detail.totals.currency) : undefined]
    .filter((part): part is string => Boolean(part));
  // an order whose offer was just selected is not yet in fulfilment: its next step (final price, payment, insurance) is
  // where the order router sends it, and the cancel stays possible until the order is dispatched
  const trackingHref = `/${locale}/orders/${encodeURIComponent(orderId)}/tracking`;
  const next = routeForOrder({ status: detail.status, governedState: detail.governedState, paymentStatus: detail.paymentStatus }, orderId, locale);
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";

  return frame(
    <>
      <section className={rx.card} aria-label={t("title")}>
        <div className={styles.etaHead}>
          <div className={styles.etaText}>
            <span className={styles.etaLabel}>{eta ? t("etaLabel") : t("statusLabel")}</span>
            <span className={styles.etaValue}>{eta ? <LocalArrival iso={eta} locale={locale} /> : offers(`status.${statusKey(detail.status)}`)}</span>
          </div>
          <span className={styles.etaChip}><bdi>{t("orderChip", { number: orderNumber(detail.id) })}</bdi></span>
        </div>
        {status === "cancelled" ? (
          <p className={`${styles.notice} ${styles.noticeWarn}`} role="status">{t("cancelledNote")}</p>
        ) : (
          <>
            <TrackingTimeline locale={locale} steps={steps} />
            {!started ? <p className={styles.notice} role="status">{t("notStarted")}</p> : null}
          </>
        )}
      </section>

      {moving ? <TrackingRefresh /> : null}

      {next !== trackingHref && status !== "cancelled" ? (
        <div className={styles.actions}>
          <ButtonLink href={next} label={orders("action.continue")} fullWidth />
        </div>
      ) : null}

      {detail.courier?.name || phone ? (
        <section className={rx.card} aria-label={t("courierLabel")}>
          <div className={styles.courier}>
            <div className={styles.courierText}>
              <span className={styles.courierLabel}>{t("courierLabel")}</span>
              {detail.courier?.name ? <span className={styles.courierName}>{detail.courier.name}</span> : null}
            </div>
            {phone ? <a className={styles.textLink} href={`tel:${phone}`}>{t("callCourier")}</a> : null}
          </div>
        </section>
      ) : null}

      <section className={rx.card} aria-label={orders("detailTitle")}>
        <Link className={styles.summaryLink} href={orderHref}>
          <FIcon icon="storefront" tone={PHARMACY_TONE} size={40} />
          <span className={styles.summaryText}>
            <span className={rx.rowTitle} data-testid="tracking-pharmacy-name">{pharmacyName ?? orders("detailTitle")}</span>
            <span className={rx.rowSub}>
              {new Intl.ListFormat(locale, { type: "unit", style: "narrow" }).format(pharmacyName ? [orders("detailTitle"), ...summary] : summary)}
            </span>
          </span>
          <span className={styles.summaryEnd}><Icon name={caret} size={18} tone="secondary" /></span>
        </Link>
      </section>

      {canCancelOrder(detail.status) ? <div className={styles.actions}><CancelOrder orderId={orderId} after="refresh" /></div> : null}
    </>,
  );
}
