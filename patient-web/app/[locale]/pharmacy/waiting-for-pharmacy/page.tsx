import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { PharmacyWaitingClient } from "@/components-next/pharmacy-waiting-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ orderId?: string; id?: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parity with app waiting-for-pharmacy: manual refresh, OFFERS_READY routing, governed cancel. */
export default async function PharmacyWaitingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const orderId = (sp.orderId || sp.id || "").trim();
  if (!isLocale(locale) || !idPattern.test(orderId)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/orders/${orderId}`}>{ar ? "الطلب" : "Order"}</Link>
      <h1>{ar ? "انتظار عروض الصيدليات" : "Waiting for pharmacy offers"}</h1>
      <PharmacyWaitingClient orderId={orderId} locale={locale} />
    </main>
  );
}
