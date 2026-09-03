import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, nursingService } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CheckCircle2, HeartHandshake, Home, MapPin, ShieldCheck } from "lucide-react";

type Props = { params: Promise<{ locale: string; citySlug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchNursingData(citySlug: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/public/ai-catalog/services?city=${encodeURIComponent(citySlug)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const items = json.items || [];
    const nursingItems = items.filter((item: any) =>
      item.service_mode?.toLowerCase().includes("home") ||
      item.name?.toLowerCase().includes("nursing") ||
      item.name?.includes("تمريض") ||
      item.name?.includes("منزل")
    );
    return {
      services: nursingItems.length > 0 ? nursingItems : items.slice(0, 5),
      city: json.city || decodeURIComponent(citySlug),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchNursingData(citySlug);

  if (!data || data.services.length === 0) {
    return { robots: { index: false, follow: false } };
  }

  const decCity = decodeURIComponent(citySlug);

  const canonical = localizedUrl(
    locale as Locale,
    `/home-nursing/${encodeURIComponent(citySlug)}`,
  );
  const title = locale === "ar"
    ? `تمريض منزلي في ${decCity} | رعاية صحية منزلية مرخصة 24/7`
    : `Home Nursing Services in ${decCity} | Licensed Care 24/7`;
  const desc = locale === "ar"
    ? `احجز خدمات تمريض منزلي ورعاية كبار السن والمصابين في ${decCity} عبر طاقم تمريضي مرخص وموثق من نبضة بلس.`
    : `Verified and licensed home nursing care in ${decCity}. Senior care, post-op, and daily assistance via Nabd Plus.`;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/home-nursing/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/home-nursing/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function HomeNursingCityPage({ params }: Props) {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchNursingData(citySlug);
  if (!data || data.services.length === 0) {
    notFound();
  }

  const decCity = decodeURIComponent(citySlug);
  const services = data.services;

  const pageTitle = locale === "ar"
    ? `خدمات التمريض المنزلي في ${decCity}`
    : `Home Nursing Services in ${decCity}`;

  return (
    <main className="main" style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem" }}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/home-nursing/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: "Home Care", locale: locale as Locale, path: "/home-care/services" },
            { name: decCity, locale: locale as Locale, path: `/home-nursing/${citySlug}` },
          ]),
          nursingService({
            name: pageTitle,
            path: `/home-nursing/${citySlug}`,
            locale: locale as Locale,
            description: `Licensed home nursing and medical visit services in ${decCity}`,
          }),
        ]}
      />

      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#111827" }}>{pageTitle}</h1>
        <p style={{ color: "#4b5563", fontSize: "1rem", margin: 0 }}>
          {locale === "ar"
            ? `طواقم تمريضية مرخصة من وزارة الصحة لتقديم الرعاية الطبية في منزلك في ${decCity}.`
            : `Licensed medical nurses delivering professional healthcare at your home in ${decCity}.`}
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
                <HeartHandshake size={18} color="#059669" />
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>{svc.name}</h2>
              </div>
              <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.875rem" }}>{svc.description}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#059669", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                <CheckCircle2 size={14} />
                <span>{locale === "ar" ? "مرخص ومعتمد" : "Licensed Staff"}</span>
              </div>
            </div>
            <Link
              href={`/${locale}/home-care/services`}
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
              {locale === "ar" ? "طلب زيارة منزلية" : "Request Visit"}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
