import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { FinalQuoteScreen } from "@/components-next/pharmacy-offers/order-screens";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ orderId?: string; id?: string }> };

/** The selected offer's final price: accept it (hash and revision from the server) or register cash on delivery. */
export default async function PharmacyFinalQuotePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const orderId = (sp.orderId || sp.id || "").trim();
  if (!isLocale(locale) || !orderId) notFound();
  setRequestLocale(locale);
  return <FinalQuoteScreen locale={locale} orderId={orderId} />;
}
