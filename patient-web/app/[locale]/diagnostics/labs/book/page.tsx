import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, FlaskConical, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPublicLabService } from "@/lib/api/labs-server";
import { extractLabService } from "@/lib/api/labs";
import { getCompatibleLabProviders } from "@/lib/api/diagnostics-server";
import { LabBookingForm } from "@/components-next/lab-booking-form";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ serviceId?: string }> };
export default async function LabBookingPage({ params, searchParams }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const { serviceId } = await searchParams; if (!serviceId) notFound();
  const token = await requirePatientAccess(locale); if (!token) redirect(`/${locale}/login`);
  const response = await getPublicLabService(serviceId); if (!response || !response.ok) notFound();
  const service = extractLabService(await response.json().catch(() => null)); if (!service) notFound();
  const providers = await getCompatibleLabProviders(serviceId);
  const provider = providers[0]; const AR = locale === "ar" || locale === "ur";
  const t = await getTranslations("Diagnostics");
  return <main className="main"><Link href={`/${locale}/diagnostics/labs`}><ChevronLeft size={16} aria-hidden="true" />{t("back")}</Link>
    <section className="hero premium-hero"><div className="premium-hero-copy"><div className="eyebrow"><ShieldCheck size={14} aria-hidden="true" />{AR ? "حجز تحليل" : "Lab booking"}</div><h1>{AR ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr}</h1><p>{AR ? "اختر الموعد والموقع وطريقة الدفع؛ التأكيد يُحفظ من الخادم." : "Choose time, location, and payment; confirmation is persisted server-side."}</p></div><FlaskConical size={28} aria-hidden="true" /></section>
    {provider ? <LabBookingForm locale={locale} serviceId={service.id} providerId={provider.id ?? provider.account_id} serviceName={AR ? service.nameAr ?? service.nameEn ?? "التحليل" : service.nameEn ?? service.nameAr ?? "Lab test"} homeEligible={Boolean(service.homeVisitSupported)} /> : <section className="state" role="alert"><FlaskConical size={26} aria-hidden="true" /><h2>{AR ? "لا يوجد مزود متاح حالياً" : "No provider is available"}</h2><p>{AR ? "لم يتم إنشاء حجز. حاول لاحقاً أو اختر تحليلاً آخر." : "No booking was created. Try later or choose another test."}</p></section>}
  </main>;
}
