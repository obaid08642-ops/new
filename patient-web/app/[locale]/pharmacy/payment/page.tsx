import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaymentScreen } from "@/components-next/pharmacy-checkout/payment-screen";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ orderId?: string | string[]; id?: string | string[] }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export async function generateMetadata({ params }: Pick<Props, "params">) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "PharmacyCheckout" });
  return { title: t("paymentTitle") };
}

/** Pay for a pharmacy order (canvas/CheckoutV2): its price was accepted, so the server has an amount and methods. */
export default async function PharmacyPaymentPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const orderId = (first(query.orderId) || first(query.id)).trim();
  if (!isLocale(locale) || !idPattern.test(orderId)) notFound();
  setRequestLocale(locale);
  return <PaymentScreen locale={locale} orderId={orderId} />;
}
