import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { parseOrderId } from "@/lib/api/orders";
import { extractPatientPharmacyOffers, extractPatientPharmacyOrderProgress } from "@/lib/api/pharmacy-offers";
import { CoreShell } from "@/components-next/core/core-shell";
import { RetryErrorState } from "@/components-next/core/core-states";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { Locale } from "@/lib/i18n";
import { InsuranceDecision } from "./insurance-decision";
import { OfferList, type OfferView } from "./offer-list";
import { OffersLiveRefresh } from "./live-refresh";
import { QuoteSection } from "./quote-section";
import { statusKey } from "./status";
import { OFFER_TONES } from "./tones";
import styles from "./offers.module.css";

const CLOSED = ["COMPLETED", "CANCELLED", "DELIVERED"];
/** Once the order is past payment the page only says where it stands and links to tracking. */
const FULFILMENT_STATES = ["CONFIRMED", "IN_FULFILLMENT", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED"];

type Props = {
  locale: Locale;
  orderId: string;
  /** `orders` is /orders/:id/offers; `broadcast` is /pharmacy/broadcast-status (a selection goes on to the tracking). */
  variant: "orders" | "broadcast";
};

/**
 * The patient's pharmacy offers (canvas/PharmacyOffers), server-rendered from the two real reads
 * (`GET /patient/pharmacy/orders/:id/offers` and `GET /patient/pharmacy/orders/:id`). What is drawn follows the
 * order's own governed state, so the screen can never show a step the server has not reached.
 */
export async function OffersScreen({ locale, orderId, variant }: Props) {
  if (!parseOrderId(orderId).success) notFound();
  const t = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const [offersResponse, orderResponse] = await Promise.all([
    callPatientApi(`/patient/pharmacy/orders/${orderId}/offers`, {}, token),
    callPatientApi(`/patient/pharmacy/orders/${orderId}`, {}, token),
  ]);
  if (offersResponse.status === 401 || orderResponse.status === 401) redirect(`/${locale}/login`);
  if ([403, 404].includes(offersResponse.status) || [403, 404].includes(orderResponse.status)) notFound();
  const orderHref = `/${locale}/orders/${orderId}`;

  if (!offersResponse.ok || !orderResponse.ok) {
    return (
      <CoreShell locale={locale} title={t("offersTitle")} backHref={orderHref}>
        <div className={styles.state}><RetryErrorState title={t("loadErrorTitle")} body={t("loadErrorBody")} retryLabel={routeState("retry")} /></div>
      </CoreShell>
    );
  }

  const offers = extractPatientPharmacyOffers(await offersResponse.json().catch(() => null));
  const progress = extractPatientPharmacyOrderProgress(await orderResponse.json().catch(() => null)) ?? {};
  const state = progress.governedState ?? "";
  const selected = state !== "" && !FULFILMENT_STATES.includes(state);
  const past = FULFILMENT_STATES.includes(state);
  const closed = CLOSED.includes(state) || CLOSED.includes((progress.status ?? "").toUpperCase());
  const browsing = !selected && !past && !closed;
  const negotiating = progress.status === "negotiating_substitutes" || state === "NEGOTIATION_REQUIRED";

  const views: OfferView[] = offers.map((offer) => ({
    id: offer.id,
    open: offer.status === "open",
    pharmacyName: offer.pharmacyName,
    total: offer.total,
    subtotal: offer.subtotal,
    deliveryFee: offer.deliveryFee,
    currency: offer.currency,
    preparationMinutes: offer.preparationMinutes,
    expiresAt: offer.expiresAt,
    insuranceReady: offer.insuranceReady,
    codAllowed: offer.codAllowed,
    distanceKm: offer.approxDistanceKm,
    note: offer.providerNote,
    lines: offer.lines.map((line) => ({ id: line.id, name: line.name, quantity: line.offeredQuantity && line.offeredQuantity > 0 ? line.offeredQuantity : undefined, unitPrice: line.unitPrice, available: line.available, alternative: line.alternative })),
  }));

  return (
    <CoreShell locale={locale} title={t("offersTitle")} backHref={orderHref}>
      <div className={styles.page}>
        <div className={styles.head}><h1 className={styles.title}>{t("offersTitle")}</h1></div>
        <Link className={styles.backLink} href={orderHref}>{t("backToOrder")}</Link>

        {browsing ? (
          <div className={styles.hero}>
            <div className={styles.pulse}>
              <span className={styles.ring} aria-hidden="true" />
              <span className={styles.ring} aria-hidden="true" />
              <FIcon icon="storefront" tone={OFFER_TONES.pharmacy} size={56} chip="solid" />
            </div>
            <div className={styles.heroText}>
              <h2 className={styles.heroTitle}>{views.length ? t("heroTitleOffers") : t("heroTitleWaiting")}</h2>
              <p className={styles.heroSub}>{views.length ? t("heroCount", { count: views.length }) : t("heroNone")}</p>
            </div>
          </div>
        ) : null}

        {browsing ? <OffersLiveRefresh active={views.length === 0} /> : null}
        {negotiating ? (
          <section className={styles.panel} aria-labelledby="negotiation-hint">
            <p className={styles.panelTitle} id="negotiation-hint">{t("negotiationHint")}</p>
            <Link href={`/${locale}/orders/${orderId}/offers/negotiation`} className={`nabd-button nabd-button--primary nabd-button--lg nabd-button--full ${styles.linkButton}`}>
              <span className="nabd-button__label">{t("negotiationLink")}</span>
            </Link>
          </section>
        ) : null}

        {state === "INSURANCE_PROCESSING" ? <p className={styles.notice} role="status">{t("insurancePending")}</p> : null}
        {state === "CONFIRMED" && progress.paymentStatus === "covered_by_insurance" ? <p className={`${styles.notice} ${styles.noticeOk}`} role="status">{t("insuranceCovered")}</p> : null}
        {state === "INSURANCE_DECISION_READY" && progress.insurance ? <InsuranceDecision locale={locale} orderId={orderId} progress={progress} /> : null}
        {selected && state !== "INSURANCE_PROCESSING" && state !== "INSURANCE_DECISION_READY" ? <QuoteSection locale={locale} orderId={orderId} progress={progress} screen="offers" /> : null}

        {past ? (
          <section className={styles.panel} aria-labelledby="past-title">
            <h2 className={styles.panelTitle} id="past-title">{t(`status.${statusKey(progress.status ?? state)}`)}</h2>
            <Link href={`/${locale}/orders/${orderId}/tracking`} className={`nabd-button nabd-button--primary nabd-button--lg nabd-button--full ${styles.linkButton}`}>
              <span className="nabd-button__label">{t("trackOrder")}</span>
            </Link>
          </section>
        ) : null}

        {browsing && views.length ? <OfferList orderId={orderId} offers={views} after={variant === "broadcast" ? "tracking" : "refresh"} /> : null}
        {browsing && views.length ? <p className={styles.privacy}>{t("privacyNote")}</p> : null}
        {browsing && !views.length ? (
          <div className={styles.state}><EmptyState icon="pill" tone={OFFER_TONES.pharmacy} title={t("emptyTitle")} body={t("emptyBody")} /></div>
        ) : null}
      </div>
    </CoreShell>
  );
}
