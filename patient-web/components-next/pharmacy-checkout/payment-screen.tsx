import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoreShell } from "@/components-next/core/core-shell";
import { LinkEmptyState } from "@/components-next/pharmacy/link-empty-state";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import { requirePatientAccess } from "@/lib/auth/session";
import { parseOrderId } from "@/lib/api/orders";
import type { Locale } from "@/lib/i18n";
import { needsCapabilities, paymentPageState, type PaymentPageState } from "@/lib/pharmacy/payment-state";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { PayScreen } from "./pay-screen";
import { readCapabilities, readOrderPaymentView } from "./read-order";
import { RetryLinkErrorState } from "./state-views";
import rx from "@/components-next/pharmacy/rx.module.css";

type StateKind = Exclude<PaymentPageState["kind"], "payable" | "unavailable">;

/** For each step the order can be in, what the patient is told and where they go next. Every one is the server's own state. */
const STATES: Record<StateKind, { icon: FillIconName; tone: ServiceTone; key: string; next: "track" | "orders" | "offers" | "quote" | "insurance" }> = {
  paid: { icon: "check-circle", tone: OFFER_TONES.good, key: "paid", next: "track" },
  covered: { icon: "shield-check", tone: OFFER_TONES.info, key: "covered", next: "track" },
  cod: { icon: "package", tone: OFFER_TONES.cod, key: "cod", next: "track" },
  closed: { icon: "warning", tone: OFFER_TONES.warn, key: "closed", next: "orders" },
  fulfilment: { icon: "package", tone: OFFER_TONES.pharmacy, key: "fulfilment", next: "track" },
  noQuote: { icon: "storefront", tone: OFFER_TONES.pharmacy, key: "noQuote", next: "offers" },
  acceptFirst: { icon: "storefront", tone: OFFER_TONES.pharmacy, key: "acceptFirst", next: "quote" },
  insuranceFirst: { icon: "shield-check", tone: OFFER_TONES.info, key: "insuranceFirst", next: "insurance" },
};

/** `/pharmacy/payment`: pay for an order whose price the patient accepted. What is drawn follows the order's own state and the server's payment capabilities. */
export async function PaymentScreen({ locale, orderId }: { locale: Locale; orderId: string }) {
  if (!parseOrderId(orderId).success) notFound();
  const t = await getTranslations({ locale, namespace: "PharmacyCheckout" });
  const offers = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const orderHref = `/${locale}/orders/${orderId}`;
  const frame = (children: React.ReactNode) => (
    <CoreShell locale={locale} title={t("paymentTitle")} backHref={orderHref} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("paymentTitle")}</h1></div>
        {children}
      </div>
    </CoreShell>
  );

  const order = await readOrderPaymentView(locale, orderId, token);
  if (!order.ok) {
    return frame(<div className={rx.state}><RetryLinkErrorState title={offers("loadErrorTitle")} body={offers("loadErrorBody")} retryLabel={routeState("retry")} actionLabel={offers("orderStatusLink")} actionHref={orderHref} /></div>);
  }
  const { view } = order;
  const caps = needsCapabilities(view) ? await readCapabilities(locale, orderId, token) : null;
  const state = paymentPageState(view, caps);

  if (state.kind === "payable") {
    const addressParts = [view.address?.label, view.address?.street, view.address?.district, view.address?.city].filter((part): part is string => Boolean(part));
    return (
      <PayScreen
        locale={locale}
        orderId={orderId}
        amount={state.amount}
        currency={state.currency}
        methods={state.methods}
        coverage={view.coverageMode === "insurance" ? "insurance" : "cash"}
        totals={view.totals}
        insurerShare={view.insurance?.insurerShare}
        address={addressParts.length ? new Intl.ListFormat(locale, { type: "unit", style: "short" }).format(addressParts) : undefined}
      />
    );
  }

  if (state.kind === "unavailable") {
    const key = state.reason === "noMethods" ? "unavailableNoMethods" : state.reason === "refused" ? "unavailableRefused" : "unavailableError";
    return frame(<div className={rx.state}><RetryLinkErrorState title={t(`${key}Title`)} body={t(`${key}Body`)} retryLabel={routeState("retry")} actionLabel={offers("orderStatusLink")} actionHref={orderHref} /></div>);
  }

  const shown = STATES[state.kind];
  const next = {
    track: { label: offers("trackOrder"), href: `${orderHref}/tracking` },
    orders: { label: t("myOrders"), href: `/${locale}/orders` },
    offers: { label: t("seeOffers"), href: `/${locale}/orders/${orderId}/offers` },
    quote: { label: t("seeQuote"), href: `/${locale}/pharmacy/final-quote?orderId=${encodeURIComponent(orderId)}` },
    insurance: { label: t("seeInsurance"), href: `/${locale}/pharmacy/insurance-decision?orderId=${encodeURIComponent(orderId)}` },
  }[shown.next];
  return frame(
    <div className={rx.state} role="status">
      <LinkEmptyState
        icon={shown.icon}
        tone={shown.tone}
        title={t(`state.${shown.key}Title`)}
        body={t(`state.${shown.key}Body`)}
        actionLabel={next.label}
        actionHref={next.href}
        secondaryLabel={shown.next === "orders" ? undefined : offers("orderStatusLink")}
        secondaryHref={shown.next === "orders" ? undefined : orderHref}
      />
    </div>,
  );
}
