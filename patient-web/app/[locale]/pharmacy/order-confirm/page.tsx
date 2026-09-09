import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ orderId?: string; id?: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function routeFor(state: string, orderId: string, locale: string): string {
  const q = `orderId=${encodeURIComponent(orderId)}`;
  if (state === "OFFERS_READY" || state === "ORDER_BROADCASTING") return `/${locale}/pharmacy/broadcast-status?${q}`;
  if (["OFFER_SELECTED", "FINAL_QUOTE_READY", "FINAL_QUOTE_ACCEPTED", "COD_REGISTERED"].includes(state)) return `/${locale}/pharmacy/final-quote?${q}`;
  if (state === "INSURANCE_PROCESSING" || state === "INSURANCE_DECISION_READY") return `/${locale}/pharmacy/insurance-decision?${q}`;
  return `/${locale}/orders/${encodeURIComponent(orderId)}/tracking`;
}

/** Parity with app order-confirm: governed router — reads state server-side, redirects to the right step. */
export default async function PharmacyOrderConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const orderId = (sp.orderId || sp.id || "").trim();
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  if (!idPattern.test(orderId)) {
    return (
      <main className="main">
        <Link href={`/${locale}/pharmacy`}>{ar ? "الصيدلية" : "Pharmacy"}</Link>
        <h1>{ar ? "تأكيد الطلب" : "Confirm order"}</h1>
        <p role="alert">{ar ? "يلزم رقم طلب الصيدلية — لا يمكن اعتماد سلة غير مكتملة." : "A pharmacy order id is required — cannot confirm an incomplete cart."}</p>
      </main>
    );
  }
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/patient/pharmacy/orders/${encodeURIComponent(orderId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) {
    return (
      <main className="main">
        <Link href={`/${locale}/pharmacy`}>{ar ? "الصيدلية" : "Pharmacy"}</Link>
        <h1>{ar ? "تأكيد الطلب" : "Confirm order"}</h1>
        <p role="alert">{ar ? "تعذر فتح خطوة الطلب" : "Could not open the order step"}</p>
        <Link href={`/${locale}/orders/${orderId}`}>{ar ? "حالة الطلب" : "Order status"}</Link>
      </main>
    );
  }
  const payload = await response.json().catch(() => null);
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const rec = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const state = typeof rec.governed_state === "string" ? rec.governed_state : "";
  redirect(routeFor(state, orderId, locale));
}
