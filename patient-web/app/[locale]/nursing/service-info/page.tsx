import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ serviceId?: string }> };

/** Parity with app nursing/service-info: profile screen, canonical detail is home-care/services/[serviceId]. */
export default async function NursingServiceInfoPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const sp = await searchParams;
  const serviceId = (sp.serviceId || "").trim();
  redirect(serviceId ? `/${locale}/home-care/services/${encodeURIComponent(serviceId)}` : `/${locale}/home-care/services`);
}
