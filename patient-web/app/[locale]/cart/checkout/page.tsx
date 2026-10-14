import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutScreen } from "@/components-next/pharmacy-checkout/checkout-screen";
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
 * pharmacies. A signed-out visitor is sent to sign in here (the handoff asks for login at checkout). An old link with
 * `?prescriptionId=` (the order of a saved prescription) goes to the screen that orders a prescription: the checkout
 * only ever sends the browser cart.
 */
export default async function CartCheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = await searchParams;
  const requested = (Array.isArray(query.prescriptionId) ? query.prescriptionId[0] : query.prescriptionId)?.trim();
  if (requested) {
    if (!idPattern.test(requested)) notFound();
    redirect(`/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(requested)}`);
  }
  await requirePatientAccess(locale);
  return <CheckoutScreen locale={locale} />;
}
