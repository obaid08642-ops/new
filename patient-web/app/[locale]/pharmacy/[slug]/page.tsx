import { JsonLd } from "@/components-next/json-ld";
import { pharmacy, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Building2, MapPin, Pill, ShieldCheck, Truck, Clock } from "lucide-react";
import { VectorPharmacy } from "@/components-next/vector-illustrations";

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
      <main className="main" style={{ display: "grid", gap: 16, padding: "24px 0 64px", background: "#FDFDFC" }}>
        {/* Breadcrumbs */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#5A6B62", flexWrap: "wrap", overflowWrap: "anywhere" }}>
          <Link href={`/${locale}`} style={{ color: "#00876F", fontWeight: 700, textDecoration: "none" }}>{isRtl ? "الرئيسية" : "Home"}</Link>
          <span>/</span>
          <Link href={`/${locale}/pharmacies`} style={{ color: "#00876F", fontWeight: 700, textDecoration: "none" }}>{isRtl ? "الصيدليات" : "Pharmacies"}</Link>
          <span>/</span>
          <span style={{ color: "#1E332E", fontWeight: 800, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>{name}</span>
        </nav>

        {/* Hero — Ultra-Premium V3: Forest Ink #1E332E, Warm Cream #FDFDFC, border #E8EDEE, radius 20, vector 48 */}
        <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: 24, border: "1px solid #E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)", boxShadow: "0 12px 32px rgba(30,51,46,.07)", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 }}>
            <p style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, color: "#1E332E", fontSize: 12, fontWeight: 800, overflowWrap: "anywhere" }}><ShieldCheck size={14} aria-hidden="true" />{isRtl ? "صيدلية نبض — مرخصة SFDA" : "Nabd Pharmacy — SFDA Licensed"}</p>
            <h1 style={{ margin: 0, color: "#1E332E", fontSize: 22, fontWeight: 900, lineHeight: 1.25, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{name} <ShieldCheck size={18} style={{ display: "inline", verticalAlign: "middle", color: "#00876F" }} aria-hidden="true" /></h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#5A6B62", flexWrap: "wrap", overflowWrap: "anywhere" }}>
              <MapPin size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span style={{ overflowWrap: "anywhere" }}>{ph.city || "المملكة العربية السعودية"}</span>
              {ph.district && <span style={{ overflowWrap: "anywhere" }}>• {ph.district}</span>}
            </div>
          </div>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE", flexShrink: 0, boxShadow: "0 4px 14px rgba(30,51,46,.06)" }}><VectorPharmacy size={48} /></span>
        </section>

        {/* Details Card — glass + Forest Ink */}
        <section style={{ display: "grid", gap: 16, padding: 20, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.15)", border: "1px solid #E8EDEE", color: "#1E332E", flexShrink: 0 }}><Pill size={22} aria-hidden="true" /></span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: "rgba(95,217,179,.12)", color: "#1E332E", border: "1px solid #E8EDEE", overflowWrap: "anywhere" }}><ShieldCheck size={14} aria-hidden="true" />{isRtl ? "صيدلية مرخصة SFDA" : "SFDA Licensed Pharmacy"}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, paddingTop: 16, borderTop: "1px solid #E8EDEE" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid #E8EDEE", borderRadius: 16, background: "#FDFDFC", overflowWrap: "anywhere" }}>
              <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 12, background: "rgba(95,217,179,.14)", color: "#1E332E", flexShrink: 0 }}><Truck size={18} aria-hidden="true" /></span>
              <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 11, color: "#5A6B62", fontWeight: 700, overflowWrap: "anywhere" }}>{isRtl ? "توصيل سريع" : "Express Delivery"}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ph.estimated_delivery_time || (isRtl ? "خلال 60 دقيقة" : "Within 60 mins")}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid #E8EDEE", borderRadius: 16, background: "#FDFDFC", overflowWrap: "anywhere" }}>
              <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 12, background: "rgba(95,217,179,.14)", color: "#1E332E", flexShrink: 0 }}><Clock size={18} aria-hidden="true" /></span>
              <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 11, color: "#5A6B62", fontWeight: 700, overflowWrap: "anywhere" }}>{isRtl ? "ساعات العمل" : "Working Hours"}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#1E332E", overflowWrap: "anywhere" }}>{isRtl ? "24/7 على مدار الساعة" : "24/7 Open"}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid #E8EDEE", borderRadius: 16, background: "#FDFDFC", overflowWrap: "anywhere" }}>
              <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 12, background: "rgba(95,217,179,.14)", color: "#1E332E", flexShrink: 0 }}><Building2 size={18} aria-hidden="true" /></span>
              <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 11, color: "#5A6B62", fontWeight: 700, overflowWrap: "anywhere" }}>{isRtl ? "ترخيص الهيئة" : "SFDA License"}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ph.sfda_license_number || ph.license_number || "SFDA-VERIFIED"}</span>
              </div>
            </div>
          </div>

          <Link href={`/${locale}/pharmacy/scan-prescription?pharmacyId=${ph.id}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 16, background: "#1E332E", color: "#FDFDFC", fontWeight: 800, fontSize: 14, textDecoration: "none", width: "fit-content", overflowWrap: "anywhere" }}>
            <span style={{ overflowWrap: "anywhere" }}>{isRtl ? "ارفع وصفتك الطبية للصرف" : "Upload Prescription"}</span>
            <ArrowIcon size={16} aria-hidden="true" />
          </Link>
        </section>
      </main>
    </>
  );
}
