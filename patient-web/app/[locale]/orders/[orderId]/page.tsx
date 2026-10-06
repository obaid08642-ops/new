import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderDetailScreen } from "@/components-next/orders/order-detail-screen";
import { parseOrderId } from "@/lib/api/orders";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string; orderId: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Orders" });
  return { title: t("detailTitle") };
}

/** One order of the patient's: where it stands, what is in it, and what to do next. */
export default async function OrderDetailPage({ params }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale) || !parseOrderId(orderId).success) notFound();
  setRequestLocale(locale);
  return <OrderDetailScreen locale={locale} orderId={orderId} />;
}
