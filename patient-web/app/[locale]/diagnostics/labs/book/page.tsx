import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getPublicLabService } from "@/lib/api/labs-server";
import { extractLabService } from "@/lib/api/labs";
import { pickText } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ serviceId?: string }> };

/**
 * One booking path (journeys#50, as the app): booking a test or package adds it to the diagnostics cart, where the lab
 * that can run every test is chosen and the order is sent. This route only adds the live catalogue item and opens the
 * cart, so it never ends on a "no lab" page with only a back button (journeys#49): the cart says when no lab fits and
 * keeps the tests.
 */
export default async function LabBookingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { serviceId } = await searchParams;
  if (!serviceId) notFound();
  const response = await getPublicLabService(serviceId);
  if (!response || !response.ok) notFound();
  const service = extractLabService(await response.json().catch(() => null));
  if (!service) notFound();
  const name = pickText(locale, service.nameAr, service.nameEn) ?? "";
  redirect(`/${locale}/diagnostics/cart?add=${encodeURIComponent(service.id)}&name=${encodeURIComponent(name)}`);
}
