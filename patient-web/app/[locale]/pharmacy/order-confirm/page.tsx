import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoreShell } from "@/components-next/core/core-shell";
import { LinkEmptyState } from "@/components-next/pharmacy/link-empty-state";
import { readOrderPaymentView } from "@/components-next/pharmacy-checkout/read-order";
import { RetryLinkErrorState } from "@/components-next/pharmacy-checkout/state-views";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { routeForOrder } from "@/lib/pharmacy/order-route";
import rx from "@/components-next/pharmacy/rx.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ orderId?: string | string[]; id?: string | string[] }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export async function generateMetadata({ params }: Pick<Props, "params">) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "PharmacyCheckout" });
  return { title: t("confirmTitle") };
}

/**
 * The address a link or a notification uses to open "an order": this page has nothing of its own to draw. It reads
 * where the order stands (the states the backend really produces) and sends the patient to the screen for that step:
 * the offers, the final price, the payment, the insurance decision or the tracking. A missing id or a failed read is
 * drawn with the board's states, with a way out.
 */
export default async function PharmacyOrderConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const orderId = (first(query.orderId) || first(query.id)).trim();
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "PharmacyCheckout" });
  const offers = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const frame = (children: React.ReactNode, back: string) => (
    <CoreShell locale={locale} title={t("confirmTitle")} backHref={back} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("confirmTitle")}</h1></div>
        <div className={rx.state}>{children}</div>
      </div>
    </CoreShell>
  );

  if (!idPattern.test(orderId)) {
    return frame(
      <LinkEmptyState icon="storefront" tone={PHARMACY_TONE} title={t("confirmNoOrderTitle")} body={t("confirmNoOrderBody")} actionLabel={t("myOrders")} actionHref={`/${locale}/orders`} secondaryLabel={t("browse")} secondaryHref={`/${locale}/pharmacy`} />,
      `/${locale}/pharmacy`,
    );
  }
  const token = await requirePatientAccess(locale);
  const order = await readOrderPaymentView(locale, orderId, token);
  if (!order.ok) {
    return frame(
      <RetryLinkErrorState title={offers("loadErrorTitle")} body={offers("loadErrorBody")} retryLabel={routeState("retry")} actionLabel={t("myOrders")} actionHref={`/${locale}/orders`} />,
      `/${locale}/orders`,
    );
  }
  redirect(routeForOrder(order.view, orderId, locale));
}
