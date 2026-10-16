import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutScreen } from "@/components-next/pharmacy-checkout/checkout-screen";
import { extractPrescriptionDetail, isOrderablePrescriptionState } from "@/lib/api/prescriptions";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ prescriptionId?: string | string[] }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Pick<Props, "params">) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "PharmacyCheckout" });
  return { title: t("title") };
}

/**
 * Checkout of the pharmacy flow (canvas/CheckoutV2): the cart of this browser becomes a request to the nearby
 * pharmacies. A signed-out visitor is sent to sign in here (the handoff asks for login at checkout).
 * Owner decision 39 (issues 1031, 1043), the app's flow: with `?prescriptionId=` (picked in rx-order, or the "order these
 * medicines" of a doctor's prescription) the checkout opens on that prescription and sends its medicines with the cart's
 * lines. A prescription that cannot be read or ordered goes back to rx-order, which says why.
 */
export default async function CartCheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = await searchParams;
  const requested = (Array.isArray(query.prescriptionId) ? query.prescriptionId[0] : query.prescriptionId)?.trim();
  if (requested && !idPattern.test(requested)) notFound();
  const token = await requirePatientAccess(locale);
  if (!requested) return <CheckoutScreen locale={locale} />;
  const response = await callPatientApi(`/prescriptions/${encodeURIComponent(requested)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  // a prescription of someone else answers 404, the same as a missing one
  if (response.status === 403 || response.status === 404) notFound();
  const detail = response.ok ? extractPrescriptionDetail(await response.json().catch(() => null)) : null;
  if (!detail || !detail.items.length || !isOrderablePrescriptionState(detail.state)) {
    redirect(`/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(requested)}`);
  }
  return <CheckoutScreen locale={locale} prescription={{ id: detail.id, names: detail.items.map((item) => item.name) }} />;
}
