import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, pharmacy } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MapPin, Pill, ShieldCheck, Truck } from "lucide-react";

type Props = { params: Promise<{ locale: string; citySlug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchPharmaciesData(citySlug: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/entity-graph/explore?city=${encodeURIComponent(citySlug)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return {
      facilities: json.facilities || [],
      city: decodeURIComponent(citySlug),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchPharmaciesData(citySlug);

  if (!data || data.facilities.length === 0) {
    return { robots: { index: false, follow: false } };
  }

  const decCity = decodeURIComponent(citySlug);

  const canonical = localizedUrl(
    locale as Locale,
    `/pharmacies/${encodeURIComponent(citySlug)}`,
  );
  const title = locale === "ar"
    ? `صيدليات ${decCity} المعتمدة | توصيل فوري للأدوية والبدائل العلاجية`
    : `Verified Pharmacies in ${decCity} | Fast Medicine Delivery`;
  const desc = locale === "ar"
    ? `ابحث عن الأدوية والبدائل في صيدليات ${decCity} المعتمدة مع خدمة البث الجغرافي الفوري والتوصيل السريع عبر نبضة بلس.`
    : `Find prescription and OTC medicines in ${decCity} with instant geo-broadcast delivery via Nabd Plus.`;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/pharmacies/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/pharmacies/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function PharmaciesCityPage({ params }: Props) {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchPharmaciesData(citySlug);
  if (!data || data.facilities.length === 0) {
    notFound();
  }

  const decCity = decodeURIComponent(citySlug);
  const facilities = data.facilities;

  const pageTitle = locale === "ar"
    ? `صيدليات ${decCity} المعتمدة`
    : `Verified Pharmacies in ${decCity}`;

  return (
    <main className="main" style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem" }}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/pharmacies/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: "Pharmacy", locale: locale as Locale, path: "/c" },
            { name: decCity, locale: locale as Locale, path: `/pharmacies/${citySlug}` },
          ]),
          pharmacy({
            name: pageTitle,
            path: `/pharmacies/${citySlug}`,
            locale: locale as Locale,
            city: decCity,
          }),
        ]}
      />

      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#111827" }}>{pageTitle}</h1>
        <p style={{ color: "#4b5563", fontSize: "1rem", margin: 0 }}>
          {locale === "ar"
            ? `شبكة الصيدليات الشريكة المعتمدة في ${decCity} لتوفير الأدوية الأصلية والبدائل الدوائية المعتمدة.`
            : `Verified partner pharmacy network in ${decCity} with official SFDA pricing and fast fulfillment.`}
        </p>
      </header>

      <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "0.75rem", padding: "1rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Truck size={24} color="#2563eb" />
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#1d4ed8" }}>
            {locale === "ar" ? "خدمة البث الجغرافي الذكي (Geo-Broadcast)" : "Smart Geo-Broadcast Delivery"}
          </h3>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#1e40af" }}>
            {locale === "ar"
              ? "يتم توجيه طلب الدواء لأقرب صيدلية متوفر لديها المنتج في نطاقك الجغرافي."
              : "Orders are routed to the closest verified pharmacy with guaranteed in-stock status."}
          </p>
        </div>
      </div>

      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#1f2937" }}>
          {locale === "ar" ? "الصيدليات والمراكز الطبية في المدينة" : "Pharmacies & Medical Centers"}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {facilities.map((fac: any) => (
            <article
              key={fac.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "1.25rem",
                backgroundColor: "#fff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Pill size={18} color="#059669" />
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>{fac.name_ar || fac.name_en}</h3>
                </div>
                <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <MapPin size={14} />
                  <span>{fac.city}</span>
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#059669", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                  <ShieldCheck size={14} />
                  <span>{locale === "ar" ? "أسعار رسمية معتمدة" : "Official Pricing"}</span>
                </div>
              </div>
              <Link
                href={`/${locale}/c`}
                style={{
                  display: "inline-block",
                  textAlign: "center",
                  backgroundColor: "#059669",
                  color: "#fff",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  textDecoration: "none",
                  fontWeight: 500,
                  marginTop: "1rem",
                  fontSize: "0.875rem",
                }}
              >
                {locale === "ar" ? "طلب الأدوية" : "Order Medicine"}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
