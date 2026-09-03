import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, labTest } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Beaker, CheckCircle2, Home, MapPin } from "lucide-react";

type Props = { params: Promise<{ locale: string; testSlug: string; citySlug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchLabTestData(testSlug: string, citySlug: string) {
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
      test: decodeURIComponent(testSlug),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, testSlug, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchLabTestData(testSlug, citySlug);

  if (!data || data.facilities.length === 0) {
    return { robots: { index: false, follow: false } };
  }

  const decTest = decodeURIComponent(testSlug);
  const decCity = decodeURIComponent(citySlug);

  const canonical = localizedUrl(
    locale as Locale,
    `/labs/${encodeURIComponent(testSlug)}/${encodeURIComponent(citySlug)}`,
  );
  const title = locale === "ar"
    ? `تحليل ${decTest} في ${decCity} | سحب عينات منزلي ومختبرات معتمدة`
    : `${decTest} Lab Test in ${decCity} | Home Sample Collection`;
  const desc = locale === "ar"
    ? `احجز تحليل ${decTest} في ${decCity} مع خيار السحب المنزلي عبر ممرضين معتمدين ونتائج موثقة عبر تطبيق نبضة بلس.`
    : `Book verified ${decTest} lab test in ${decCity} with home collection and fast results via Nabd Plus.`;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/labs/${encodeURIComponent(testSlug)}/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/labs/${encodeURIComponent(testSlug)}/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function LabTestCityPage({ params }: Props) {
  const { locale, testSlug, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchLabTestData(testSlug, citySlug);
  if (!data || data.facilities.length === 0) {
    notFound();
  }

  const decTest = decodeURIComponent(testSlug);
  const decCity = decodeURIComponent(citySlug);
  const facilities = data.facilities;

  const pageTitle = locale === "ar"
    ? `تحليل ${decTest} في ${decCity}`
    : `${decTest} Lab Test in ${decCity}`;

  return (
    <main className="main" style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem" }}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/labs/${testSlug}/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: "Diagnostics", locale: locale as Locale, path: "/diagnostics/labs" },
            { name: decTest, locale: locale as Locale, path: `/labs/${testSlug}` },
            { name: decCity, locale: locale as Locale, path: `/labs/${testSlug}/${citySlug}` },
          ]),
          labTest({
            name: decTest,
            path: `/labs/${testSlug}/${citySlug}`,
            locale: locale as Locale,
            description: `Verified ${decTest} diagnostic test in ${decCity}`,
          }),
        ]}
      />

      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#111827" }}>{pageTitle}</h1>
        <p style={{ color: "#4b5563", fontSize: "1rem", margin: 0 }}>
          {locale === "ar"
            ? `فحوصات مخبرية دقيقة معتمدة في ${decCity}. إمكانية سحب العينات من المنزل أو زيارة أقرب مختبر معتمد.`
            : `Accurate diagnostic laboratory tests in ${decCity}. Home blood draw available.`}
        </p>
      </header>

      <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.75rem", padding: "1rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Home size={24} color="#16a34a" />
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#15803d" }}>
            {locale === "ar" ? "خدمة السحب المنزلي متوفرة" : "Home Collection Available"}
          </h3>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#166534" }}>
            {locale === "ar" ? "أخصائي تمريض يصل إلى منزلك لسحب العينة وتسليمها للمختبر المعتمد." : "Certified nurse collects the sample from your home."}
          </p>
        </div>
      </div>

      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#1f2937" }}>
          {locale === "ar" ? "المراكز والمختبرات الشريكة" : "Partner Laboratories"}
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
                  <Beaker size={18} color="#059669" />
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>{fac.name_ar || fac.name_en}</h3>
                </div>
                <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <MapPin size={14} />
                  <span>{fac.city}</span>
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#059669", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                  <CheckCircle2 size={14} />
                  <span>{locale === "ar" ? "معتمد ومرخص" : "Accredited Lab"}</span>
                </div>
              </div>
              <Link
                href={`/${locale}/diagnostics/labs`}
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
                {locale === "ar" ? "احجز الفحص الآن" : "Book Test"}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
