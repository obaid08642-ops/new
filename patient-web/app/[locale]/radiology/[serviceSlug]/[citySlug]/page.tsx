import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, radiologyService } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Building2, Calendar, MapPin, Scan } from "lucide-react";

type Props = { params: Promise<{ locale: string; serviceSlug: string; citySlug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchRadiologyData(serviceSlug: string, citySlug: string) {
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
      service: decodeURIComponent(serviceSlug),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, serviceSlug, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchRadiologyData(serviceSlug, citySlug);

  if (!data || data.facilities.length === 0) {
    return { robots: { index: false, follow: false } };
  }

  const decService = decodeURIComponent(serviceSlug);
  const decCity = decodeURIComponent(citySlug);

  const canonical = localizedUrl(
    locale as Locale,
    `/radiology/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`,
  );
  const title = locale === "ar"
    ? `أشعة ${decService} في ${decCity} | حجز فوري بمراكز الأشعة المعتمدة`
    : `${decService} Radiology in ${decCity} | Diagnostic Imaging Centers`;
  const desc = locale === "ar"
    ? `احجز موعد أشعة ${decService} (رنين مغناطيسي، أشعة مقطعية، موجات صوتية) في ${decCity} عبر مراكز معتمدة وبأسعار شفافة.`
    : `Book verified ${decService} imaging appointments in ${decCity} with accredited medical centers via Nabd Plus.`;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/radiology/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/radiology/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function RadiologyCityPage({ params }: Props) {
  const { locale, serviceSlug, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchRadiologyData(serviceSlug, citySlug);
  if (!data || data.facilities.length === 0) {
    notFound();
  }

  const decService = decodeURIComponent(serviceSlug);
  const decCity = decodeURIComponent(citySlug);
  const facilities = data.facilities;

  const pageTitle = locale === "ar"
    ? `أشعة وتصوير ${decService} في ${decCity}`
    : `${decService} Imaging in ${decCity}`;

  return (
    <main className="main" style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem" }}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/radiology/${serviceSlug}/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: "Radiology", locale: locale as Locale, path: "/diagnostics/radiology" },
            { name: decService, locale: locale as Locale, path: `/radiology/${serviceSlug}` },
            { name: decCity, locale: locale as Locale, path: `/radiology/${serviceSlug}/${citySlug}` },
          ]),
          radiologyService({
            name: decService,
            path: `/radiology/${serviceSlug}/${citySlug}`,
            locale: locale as Locale,
            description: `Verified ${decService} diagnostic imaging procedure in ${decCity}`,
          }),
        ]}
      />

      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#111827" }}>{pageTitle}</h1>
        <p style={{ color: "#4b5563", fontSize: "1rem", margin: 0 }}>
          {locale === "ar"
            ? `مراكز أشعة وتصوير طبي مجهزة بأحدث التقنيات في ${decCity} مع تقارير فورية معتمدة.`
            : `State-of-the-art diagnostic imaging centers in ${decCity} with instant reporting.`}
        </p>
      </header>

      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#1f2937" }}>
          {locale === "ar" ? "مراكز الأشعة والمستشفيات المتاحة" : "Available Imaging Centers"}
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
                  <Scan size={18} color="#2563eb" />
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>{fac.name_ar || fac.name_en}</h3>
                </div>
                <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <MapPin size={14} />
                  <span>{fac.city}</span>
                </p>
              </div>
              <Link
                href={`/${locale}/diagnostics/radiology`}
                style={{
                  display: "inline-block",
                  textAlign: "center",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  textDecoration: "none",
                  fontWeight: 500,
                  marginTop: "1rem",
                  fontSize: "0.875rem",
                }}
              >
                {locale === "ar" ? "حجز موعد فحص" : "Book Imaging"}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
