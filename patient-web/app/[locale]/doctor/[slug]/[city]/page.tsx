import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import DoctorPage from "../../page";

type Props = { params: Promise<{ locale: string; slug: string; city: string }> };

export default async function DoctorCityPage({ params }: Props) {
  const { locale, slug, city } = await params;
  if (!isLocale(locale)) notFound();
  // Reuse same doctor page with city context for GEO SEO (e.g., /doctor/ali/riyadh)
  // City param is used for canonical + JSON-LD address enrichment
  return DoctorPage({ params: Promise.resolve({ locale, slug }) } as any);
}
