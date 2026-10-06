import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { WaitingScreen } from "@/components-next/pharmacy-offers/order-screens";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ orderId?: string; id?: string }> };

/** Waiting for the pharmacies: the order's own status, a manual refresh, and a confirmed cancel. Offers send the patient on. */
export default async function PharmacyWaitingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const orderId = (sp.orderId || sp.id || "").trim();
  if (!isLocale(locale) || !orderId) notFound();
  setRequestLocale(locale);
  return <WaitingScreen locale={locale} orderId={orderId} />;
}
