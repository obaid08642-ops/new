import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { NegotiationListScreen } from "@/components-next/pharmacy-offers/order-screens";

type Props = { params: Promise<{ locale: string; orderId: string }> };

/** The order's conversations with pharmacies about substitutes. */
export default async function PharmacyNegotiationListPage({ params }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <NegotiationListScreen locale={locale} orderId={orderId} />;
}
