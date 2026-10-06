import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { parseOrderId } from "@/lib/api/orders";
import { extractPatientPharmacyOffers, extractPatientPharmacyOrderProgress, type PatientPharmacyOrderProgress } from "@/lib/api/pharmacy-offers";
import { CoreShell } from "@/components-next/core/core-shell";
import { RetryErrorState } from "@/components-next/core/core-states";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { Locale } from "@/lib/i18n";
import { formatMoney, pickName } from "./format";
import { OfferList, type OfferView } from "./offer-list";
import { OffersLiveRefresh } from "./live-refresh";
import { InsuranceDecisionActions } from "./payment-actions";
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

/** The insurer's decision for each item, in the server's amounts, and the patient's two explicit choices. */
async function InsuranceDecision({ locale, orderId, progress }: { locale: Locale; orderId: string; progress: PatientPharmacyOrderProgress }) {
  const t = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const insurance = progress.insurance;
  if (!insurance) return null;
  const names = new Map((progress.items ?? []).map((item) => [item.id, pickName(locale, { ar: item.nameAr, en: item.nameEn, raw: item.rawName })]));
  const decisionLabel = (value?: string) => (value === "APPROVED_FULL" || value === "APPROVED_PARTIAL" || value === "REJECTED" ? t(`decision.${value}`) : null);
  // The server's own rules: a share can be accepted when it is above zero; paying the full price is open after a partial or a rejected decision.
  const canCoPay = Number(insurance.coPayAmount) > 0;
  const canSelfPay = insurance.decision === "APPROVED_PARTIAL" || insurance.decision === "REJECTED";
  return (
    <section className={styles.panel} aria-labelledby="insurance-title">
      <h2 className={styles.panelTitle} id="insurance-title">{t("insuranceDecisionTitle")}</h2>
      {insurance.decision && decisionLabel(insurance.decision) ? <p className={styles.note}><strong>{decisionLabel(insurance.decision)}</strong></p> : null}
      <ul className={styles.insuranceRows}>
        {insurance.items.map((item) => (
          <li key={item.id} className={styles.insuranceRow}>
            <span className={styles.insuranceName}>{names.get(item.id) ?? t("pharmacyFallback")}</span>
            {decisionLabel(item.decision) ? <span className={styles.meta}>{decisionLabel(item.decision)}</span> : null}
            <dl className={styles.sums}>
              {item.coveredAmount !== undefined ? <div className={styles.sum}><dt>{t("coveredLabel")}</dt><dd>{formatMoney(locale, item.coveredAmount)}</dd></div> : null}
              {item.coPayAmount !== undefined ? <div className={styles.sum}><dt>{t("coPayLabel")}</dt><dd>{formatMoney(locale, item.coPayAmount)}</dd></div> : null}
            </dl>
            {item.reason ? <span className={styles.note}>{t("reasonLabel")}: {item.reason}</span> : null}
          </li>
        ))}
      </ul>
      {insurance.coPayAmount !== undefined ? (
        <dl className={styles.sums}>
          <div className={`${styles.sum} ${styles.sumTotal}`}><dt>{t("coPayLabel")}</dt><dd>{formatMoney(locale, insurance.coPayAmount)}</dd></div>
        </dl>
      ) : null}
      <InsuranceDecisionActions orderId={orderId} canCoPay={canCoPay} canSelfPay={canSelfPay} />
    </section>
  );
}
