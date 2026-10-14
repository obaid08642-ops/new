import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { NegotiationThreadScreen } from "@/components-next/pharmacy-offers/order-screens";

type Props = { params: Promise<{ locale: string; orderId: string; threadId: string }> };

/** One conversation with a pharmacy: its messages, a reply, and the decisions on a suggested substitute. */
export default async function PharmacyNegotiationThreadPage({ params }: Props) {
  const { locale, orderId, threadId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <NegotiationThreadScreen locale={locale} orderId={orderId} threadId={threadId} />;
}
