import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { OffersScreen } from "@/components-next/pharmacy-offers/offers-screen";

type Props = { params: Promise<{ locale: string; orderId: string }> };

/** The order's pharmacy offers (canvas/PharmacyOffers): the real offers, then the selected quote and its payment path. */
export default async function PharmacyOffersPage({ params }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <OffersScreen locale={locale} orderId={orderId} variant="orders" />;
}
