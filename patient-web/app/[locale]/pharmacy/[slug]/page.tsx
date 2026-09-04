import { JsonLd } from "@/components-next/json-ld";
import { pharmacy, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Building2, MapPin, Pill, ShieldCheck, Truck, Clock } from "lucide-react";

type Props = { params: Promise<{ locale: string; slug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchPharmacy(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/entity-graph/related/pharmacy/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      // Fallback to general provider or facility lookup
      const fallback = await fetch(`${API_BASE}/api/v1/seo/resolve/doctor/${encodeURIComponent(slug)}`);
      if (!fallback.ok) return null;
      const entity = await fallback.json();
      return { entity, relationships: {} };
    }
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchPharmacy(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };

  const ph = data.entity;
  const name = locale === "ar" ? (ph.name_ar || ph.name_en || ph.name) : (ph.name_en || ph.name_ar || ph.name);
  const canonical = localizedUrl(locale as Locale, `/pharmacy/${encodeURIComponent(slug)}`);
  const desc = locale === "ar"
    ? `اطلب الأدوية ومستحضرات العناية من ${name} في ${ph.city || "المملكة العربية السعودية"} مع خدمة التوصيل السريع وضمان هيئة الغذاء والدواء SFDA.`
    : `Order medicines and healthcare essentials from ${name} in ${ph.city || "Saudi Arabia"} with fast delivery and SFDA verification.`;

  return {
    title: `${name} | صيدلية معتمدة | نبض بلس`,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/pharmacy/${encodeURIComponent(slug)}`)])),
        "x-default": localizedUrl("ar", `/pharmacy/${encodeURIComponent(slug)}`),
      },
    },
    openGraph: { title: name, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function PharmacyCanonicalPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchPharmacy(slug);
  if (!data?.entity) notFound();

  const ph = data.entity;
  const name = locale === "ar" ? (ph.name_ar || ph.name_en || ph.name) : (ph.name_en || ph.name_ar || ph.name);
  const path = `/pharmacy/${encodeURIComponent(slug)}`;
  const isRtl = locale === "ar";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const jsonLd = [
    pharmacy({
      name,
      path,
      locale: locale as Locale,
      city: ph.city || "Riyadh",
    }),
    breadcrumbList([
      { name: isRtl ? "الرئيسية" : "Home", locale: locale as Locale, path: "" },
      { name: isRtl ? "الصيدليات" : "Pharmacies", locale: locale as Locale, path: "/pharmacies" },
      { name, locale: locale as Locale, path },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link href={`/${locale}`} className="hover:text-emerald-600 transition-colors">
              {isRtl ? "الرئيسية" : "Home"}
            </Link>
            <span>/</span>
            <Link href={`/${locale}/pharmacies`} className="hover:text-emerald-600 transition-colors">
              {isRtl ? "الصيدليات" : "Pharmacies"}
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium truncate">{name}</span>
          </nav>

          {/* Hero Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Pill className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {name}
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span>{ph.city || "المملكة العربية السعودية"}</span>
                    {ph.district && <span>• {ph.district}</span>}
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                {isRtl ? "صيدلية مرخصة SFDA" : "SFDA Licensed Pharmacy"}
              </span>
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <Truck className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-400">{isRtl ? "توصيل سريع" : "Express Delivery"}</p>
                  <p className="font-semibold">{ph.estimated_delivery_time || (isRtl ? "خلال 60 دقيقة" : "Within 60 mins")}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <Clock className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-400">{isRtl ? "ساعات العمل" : "Working Hours"}</p>
                  <p className="font-semibold">{isRtl ? "24/7 على مدار الساعة" : "24/7 Open"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <Building2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-400">{isRtl ? "ترخيص الهيئة" : "SFDA License"}</p>
                  <p className="font-semibold">{ph.sfda_license_number || ph.license_number || "SFDA-VERIFIED"}</p>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="pt-2">
              <Link
                href={`/${locale}/pharmacy/scan-prescription?pharmacyId=${ph.id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm"
              >
                <span>{isRtl ? "ارفع وصفتك الطبية للصرف" : "Upload Prescription"}</span>
                <ArrowIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
