import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrackingScreen } from "@/components-next/orders/tracking-screen";
import { parseOrderId } from "@/lib/api/orders";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string; orderId: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "OrderTracking" });
  return { title: t("title") };
}

/** Where an order is on its way to the patient (canvas/OrderTracking). */
export default async function OrderTrackingPage({ params }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale) || !parseOrderId(orderId).success) notFound();
  setRequestLocale(locale);
  return <TrackingScreen locale={locale} orderId={orderId} />;
}
