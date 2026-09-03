import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, physician } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Building2, MapPin, ShieldCheck, Star, Stethoscope } from "lucide-react";

type Props = { params: Promise<{ locale: string; specialty: string; city: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchDoctorsByLocation(specialty: string, city: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/entity-graph/explore?specialty=${encodeURIComponent(specialty)}&city=${encodeURIComponent(city)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, specialty, city } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchDoctorsByLocation(specialty, city);

  // If no providers or facilities exist, do not index thin page
  if (!data || (data.total_doctors === 0 && data.total_facilities === 0)) {
    return { robots: { index: false, follow: false } };
  }

  const canonical = localizedUrl(locale as Locale, `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}`);
  const title = locale === "ar"
    ? `أطباء ${specialty} في ${city} | احجز موعدك الآن`
    : `${specialty} Doctors in ${city} | Book Appointment`;
  const desc = locale === "ar"
    ? `قائمة الأطباء المعتمدين لتخصص ${specialty} في ${city}. احجز استشارتك مع نخبة من الأطباء والمراكز المعتمدة عبر نبضة بلس.`
    : `Verified ${specialty} doctors and clinics in ${city}. Book in-clinic or online consultation via Nabd Plus.`;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}`)])),
        "x-default": localizedUrl("ar", `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorsSpecialtyCityPage({ params }: Props) {
  const { locale, specialty, city } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchDoctorsByLocation(specialty, city);
  // Anti-thin doorway page rule: must have at least one doctor or facility
  if (!data || (data.total_doctors === 0 && data.total_facilities === 0)) {
    notFound();
  }

  const doctors = data.doctors || [];
  const facilities = data.facilities || [];

  const pageTitle = locale === "ar"
    ? `أطباء ${specialty} في ${city}`
    : `${specialty} Doctors in ${city}`;

  return (
    <main className="main" style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem" }}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/doctors/${specialty}/${city}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: specialty, locale: locale as Locale, path: `/consultations/specialties` },
            { name: city, locale: locale as Locale, path: `/doctors/${specialty}/${city}` },
          ]),
        ]}
      />

      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#111827" }}>{pageTitle}</h1>
        <p style={{ color: "#4b5563", fontSize: "1.05rem", margin: 0 }}>
          {locale === "ar"
            ? `استعرض الأطباء والمراكز الطبية المعتمدة في ${city} مع تقييمات موثقة وأسعار شفافة.`
            : `Browse verified doctors and clinics in ${city} with verified reviews and transparent pricing.`}
        </p>
      </header>

      {doctors.length ? (
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, margin: "0 0 1rem 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Stethoscope size={20} color="#0066CC" />
            {locale === "ar" ? "الأطباء المتاحون" : "Available Doctors"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {doctors.map((doc: any) => (
              <div key={doc.id} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.1rem" }}>
                  <Link href={`/${locale}/doctor/${doc.slug || doc.id}`} style={{ color: "#0066CC", textDecoration: "none" }}>
                    {locale === "ar" ? (doc.name_ar || doc.name_en) : (doc.name_en || doc.name_ar)}
                  </Link>
                </h3>
                <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 0.75rem 0" }}>{doc.specialty}</p>
                {doc.rating ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#eab308", fontSize: "0.85rem", marginBottom: "1rem" }}>
                    <Star size={14} fill="#eab308" />
                    <strong style={{ color: "#374151" }}>{doc.rating}</strong>
                  </div>
                ) : null}
                <Link
                  href={`/${locale}/consultations/doctors/${doc.id || doc.slug}`}
                  style={{ display: "inline-block", background: "#0066CC", color: "#ffffff", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}
                >
                  {locale === "ar" ? "حجز موعد" : "Book Appointment"}
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {facilities.length ? (
        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, margin: "0 0 1rem 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Building2 size={20} color="#16a34a" />
            {locale === "ar" ? "المستشفيات والمراكز التابعة" : "Associated Hospitals & Clinics"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {facilities.map((fac: any) => (
              <div key={fac.id} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.1rem" }}>
                  <Link href={`/${locale}/facility/${fac.slug || fac.id}`} style={{ color: "#16a34a", textDecoration: "none" }}>
                    {locale === "ar" ? (fac.name_ar || fac.name_en) : (fac.name_en || fac.name_ar)}
                  </Link>
                </h3>
                <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <MapPin size={14} />
                  <span>{fac.city} {fac.district ? `- ${fac.district}` : ""}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
