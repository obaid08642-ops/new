import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, service } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Activity, Clock, MapPin, ShieldCheck } from "lucide-react";

type Props = { params: Promise<{ locale: string; serviceSlug: string; citySlug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchServiceData(serviceSlug: string, citySlug: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/public/ai-catalog/services?city=${encodeURIComponent(citySlug)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const items = json.items || [];
    const matched = items.filter((item: any) =>
      item.service_id?.toLowerCase() === serviceSlug.toLowerCase() ||
      item.name?.toLowerCase().includes(serviceSlug.toLowerCase()) ||
      serviceSlug === "all" ||
      serviceSlug === "medical"
    );
    return {
      total: matched.length > 0 ? matched.length : items.length,
      services: matched.length > 0 ? matched : items,
      city: json.city || decodeURIComponent(citySlug),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, serviceSlug, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchServiceData(serviceSlug, citySlug);

  if (!data || data.services.length === 0) {
    return { robots: { index: false, follow: false } };
  }

  const decService = decodeURIComponent(serviceSlug);
  const decCity = decodeURIComponent(citySlug);

  const canonical = localizedUrl(
    locale as Locale,
    `/services/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`,
  );
  const title = locale === "ar"
    ? `خدمات ${decService} في ${decCity} | حجز مباشر ورعاية متكاملة`
    : `${decService} Services in ${decCity} | Instant Healthcare Booking`;
  const desc = locale === "ar"
    ? `احجز خدمات ${decService} المعتمدة في ${decCity} عبر منصة نبضة بلس. رعاية منزلية، وعيادات متخصصة بأعلى معايير الجودة.`
    : `Verified ${decService} healthcare services in ${decCity}. In-clinic and home care via Nabd Plus.`;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/services/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/services/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function ServiceCityPage({ params }: Props) {
  const { locale, serviceSlug, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchServiceData(serviceSlug, citySlug);
  if (!data || data.services.length === 0) {
    notFound();
  }

  const services = data.services;
  const decService = decodeURIComponent(serviceSlug);
  const decCity = decodeURIComponent(citySlug);

  const pageTitle = locale === "ar"
    ? `خدمات ${decService} في ${decCity}`
    : `${decService} Services in ${decCity}`;

  return (
    <main className="main" style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem" }}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/services/${serviceSlug}/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: "Services", locale: locale as Locale, path: "/services" },
            { name: decService, locale: locale as Locale, path: `/services/${serviceSlug}` },
            { name: decCity, locale: locale as Locale, path: `/services/${serviceSlug}/${citySlug}` },
          ]),
        ]}
      />

      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#111827" }}>{pageTitle}</h1>
        <p style={{ color: "#4b5563", fontSize: "1rem", margin: 0 }}>
          {locale === "ar"
            ? `استعرض قائمة الخدمات الطبية المعتمدة في ${decCity} مع مواعيد فورية وتغطية تأمينية شاملة.`
            : `Verified healthcare services in ${decCity} with transparent pricing and insurance coverage.`}
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {services.map((svc: any, idx: number) => (
          <article
            key={svc.service_id || idx}
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
                <Activity size={18} color="#059669" />
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{svc.name}</h2>
              </div>
              <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.875rem" }}>{svc.description}</p>
              {svc.service_mode && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#374151", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  <Clock size={14} />
                  <span>{svc.service_mode}</span>
                </div>
              )}
              {svc.insurance_accepted?.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#059669", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                  <ShieldCheck size={14} />
                  <span>{svc.insurance_accepted.join(", ")}</span>
                </div>
              )}
            </div>
            <Link
              href={`/${locale}/services`}
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
              {locale === "ar" ? "طلب الخدمة" : "Book Service"}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
