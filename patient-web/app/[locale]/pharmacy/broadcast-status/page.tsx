import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { OffersScreen } from "@/components-next/pharmacy-offers/offers-screen";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ requestId?: string; orderId?: string; id?: string }> };

/** The same offers as the order's page, reached from the order request; choosing an offer goes on to the order's tracking. */
export default async function PharmacyBroadcastStatusPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const orderId = (sp.requestId || sp.orderId || sp.id || "").trim();
  if (!isLocale(locale) || !orderId) notFound();
  setRequestLocale(locale);
  return <OffersScreen locale={locale} orderId={orderId} variant="broadcast" />;
}
