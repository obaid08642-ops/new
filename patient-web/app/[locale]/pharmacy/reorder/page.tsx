import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { PharmacyReorderClient } from "@/components-next/pharmacy-reorder-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ orderId?: string; id?: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parity with app reorder: select items + qty + default address + draft + submit with stable idempotency. */
export default async function PharmacyReorderPage({ params, searchParams }: Props) {
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
      <h1>{ar ? "إعادة طلب الصيدلية" : "Reorder pharmacy"}</h1>
      <p>{ar ? "ستنشئ مسودة طلب جديدة بنفس الأصناف المحددة ثم تُبث على الصيدليات." : "A new draft order is created from the selected items, then broadcast to pharmacies."}</p>
      <PharmacyReorderClient orderId={orderId} locale={locale} />
    </main>
  );
}
