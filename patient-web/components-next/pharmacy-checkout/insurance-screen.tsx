import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoreShell } from "@/components-next/core/core-shell";
import { LinkEmptyState } from "@/components-next/pharmacy/link-empty-state";
import { InsuranceDecision } from "@/components-next/pharmacy-offers/insurance-decision";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import { extractPatientPharmacyOrderProgress } from "@/lib/api/pharmacy-offers";
import { parseOrderId } from "@/lib/api/orders";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n";
import { parseOrderPaymentView } from "@/lib/pharmacy/payment-state";
import { readCapabilities } from "./read-order";
import { RetryLinkErrorState } from "./state-views";
import { InsuranceStatusRefresh } from "./status-refresh";
import rx from "@/components-next/pharmacy/rx.module.css";
import ov from "@/components-next/pharmacy-offers/offers.module.css";

/**
 * `/pharmacy/insurance-decision`: what the insurer decided for the order, in the server's amounts, and the patient's
 * choices. It follows the order's own governed state; while the insurer has not decided it re-reads the order.
 * Whether the patient has already accepted is learned from the server too: the payment capabilities are refused until
 * a decision is accepted and answered once it is.
 */
export async function InsuranceScreen({ locale, orderId }: { locale: Locale; orderId: string }) {
  if (!parseOrderId(orderId).success) notFound();
  const t = await getTranslations({ locale, namespace: "PharmacyCheckout" });
  const offers = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const orderHref = `/${locale}/orders/${orderId}`;
  const frame = (children: React.ReactNode) => (
    <CoreShell locale={locale} title={t("insuranceTitle")} backHref={orderHref} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("insuranceTitle")}</h1></div>
        <Link className={ov.backLink} href={orderHref}>{offers("backToOrder")}</Link>
        {children}
      </div>
    </CoreShell>
  );

  const response = await callPatientApi(`/patient/pharmacy/orders/${orderId}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const payload: unknown = response.ok ? await response.json().catch(() => null) : null;
  const view = parseOrderPaymentView(payload);
  const progress = extractPatientPharmacyOrderProgress(payload);
  if (!view || !progress) {
    return frame(<div className={rx.state}><RetryLinkErrorState title={offers("loadErrorTitle")} body={offers("loadErrorBody")} retryLabel={routeState("retry")} actionLabel={offers("orderStatusLink")} actionHref={orderHref} /></div>);
  }

  const governed = view.governedState ?? "";
  const track = `${orderHref}/tracking`;
  const payHref = `/${locale}/pharmacy/payment?orderId=${encodeURIComponent(orderId)}`;
  const linkButton = (href: string, label: string, primary = true) => (
    <Link href={href} className={`nabd-button nabd-button--${primary ? "primary" : "secondary"} nabd-button--lg nabd-button--full ${ov.linkButton}`}>
      <span className="nabd-button__label">{label}</span>
    </Link>
  );

  if (view.paymentStatus === "paid") {
    return frame(
      <>
        <p className={`${ov.notice} ${ov.noticeOk}`} role="status">{t("insurancePaid")}</p>
        {linkButton(track, offers("trackOrder"))}
      </>,
    );
  }
  if (governed === "INSURANCE_PROCESSING") {
    return frame(
      <>
        <p className={ov.notice} role="status">{offers("insurancePending")}</p>
        <InsuranceStatusRefresh />
      </>,
    );
  }
  if (view.paymentStatus === "covered_by_insurance") {
    return frame(
      <>
        <p className={`${ov.notice} ${ov.noticeOk}`} role="status">{offers("insuranceCovered")}</p>
        {linkButton(track, offers("trackOrder"))}
      </>,
    );
  }
  // INSURANCE_DECISION_READY waits for the patient; paying the full price (self-pay) moves the order on to FINAL_QUOTE_ACCEPTED
  if (progress.insurance && (governed === "INSURANCE_DECISION_READY" || governed === "FINAL_QUOTE_ACCEPTED")) {
    // an accepted decision is one the server will now quote a payment for
    const caps = await readCapabilities(locale, orderId, token);
    if (caps.status === "ok") {
      return frame(
        <>
          <p className={`${ov.notice} ${ov.noticeOk}`} role="status"><span><strong>{t("insuranceAcceptedTitle")}</strong> {t("insuranceAcceptedBody")}</span></p>
          {linkButton(payHref, offers("continuePayment"))}
        </>,
      );
    }
    if (governed === "INSURANCE_DECISION_READY") return frame(<InsuranceDecision locale={locale} orderId={orderId} progress={progress} />);
  }
  return frame(
    <div className={rx.state}>
      <LinkEmptyState
        icon="shield-check"
        tone={OFFER_TONES.info}
        title={t("insuranceNaTitle")}
        body={t("insuranceNaBody")}
        actionLabel={offers("orderStatusLink")}
        actionHref={orderHref}
      />
    </div>,
  );
}
