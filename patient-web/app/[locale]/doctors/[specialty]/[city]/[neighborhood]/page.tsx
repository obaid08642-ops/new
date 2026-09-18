import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, physician } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { VectorDoctor } from "@/components-next/vector-illustrations";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Building2, MapPin, ShieldCheck, Star } from "lucide-react";

type Props = { params: Promise<{ locale: string; specialty: string; city: string; neighborhood: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchDoctorsByNeighborhood(specialty: string, city: string, neighborhood: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/entity-graph/explore?specialty=${encodeURIComponent(specialty)}&city=${encodeURIComponent(city)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    // Filter facilities and doctors in or near the neighborhood
    const normNeigh = decodeURIComponent(neighborhood).toLowerCase();
    const filteredFacs = (json.facilities || []).filter((f: any) =>
      (f.district && f.district.toLowerCase().includes(normNeigh)) ||
      (f.address && f.address.toLowerCase().includes(normNeigh))
    );
    return {
      ...json,
      facilities: filteredFacs.length ? filteredFacs : json.facilities,
      neighborhood: decodeURIComponent(neighborhood),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, specialty, city, neighborhood } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchDoctorsByNeighborhood(specialty, city, neighborhood);

  if (!data || (data.total_doctors === 0 && data.facilities?.length === 0)) {
    return { robots: { index: false, follow: false } };
  }

  const decSpec = decodeURIComponent(specialty);
  const decCity = decodeURIComponent(city);
  const decNeigh = decodeURIComponent(neighborhood);

  const canonical = localizedUrl(
    locale as Locale,
    `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}/${encodeURIComponent(neighborhood)}`,
  );
  const title = locale === "ar"
    ? `أطباء ${decSpec} في حي ${decNeigh}، ${decCity} | احجز الآن`
    : `${decSpec} Doctors in ${decNeigh}, ${decCity} | Book Appointment`;
  const desc = locale === "ar"
    ? `أفضل أطباء ${decSpec} والمراكز الطبية المعتمدة في حي ${decNeigh} بمدينة ${decCity}. استشارات عيادية وتطبيب عن بعد مع نبضة بلس.`
    : `Verified ${decSpec} doctors in ${decNeigh}, ${decCity}. Book consultations via Nabd Plus.`;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(
              l,
              `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}/${encodeURIComponent(neighborhood)}`,
            ),
          ]),
        ),
        "x-default": localizedUrl(
          "ar",
          `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}/${encodeURIComponent(neighborhood)}`,
        ),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorsSpecialtyCityNeighborhoodPage({ params }: Props) {
  const { locale, specialty, city, neighborhood } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchDoctorsByNeighborhood(specialty, city, neighborhood);
  if (!data || (data.total_doctors === 0 && data.facilities?.length === 0)) {
    notFound();
  }

  const doctors = data.doctors || [];
  const facilities = data.facilities || [];
  const decSpec = decodeURIComponent(specialty);
  const decCity = decodeURIComponent(city);
  const decNeigh = decodeURIComponent(neighborhood);

  const pageTitle = locale === "ar"
    ? `أطباء ${decSpec} في حي ${decNeigh}، ${decCity}`
    : `${decSpec} Doctors in ${decNeigh}, ${decCity}`;

  return (
    <main className="main" style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem", background: "#FDFDFC" }}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/doctors/${specialty}/${city}/${neighborhood}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: decSpec, locale: locale as Locale, path: `/consultations/specialties` },
            { name: decCity, locale: locale as Locale, path: `/doctors/${specialty}/${city}` },
            { name: decNeigh, locale: locale as Locale, path: `/doctors/${specialty}/${city}/${neighborhood}` },
          ]),
        ]}
      />

      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{pageTitle}</h1>
        <p style={{ color: "#4b5563", fontSize: "1rem", margin: 0 }}>
          {locale === "ar"
            ? `استعرض الأطباء والعيادات المعتمدة في حي ${decNeigh} بمدينة ${decCity} مع مواعيد فورية وتغطية تأمينية.`
            : `Verified healthcare professionals and clinics in ${decNeigh}, ${decCity} with instant booking.`}
        </p>
      </header>

      {doctors.length > 0 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#1E332E" }}>
            {locale === "ar" ? "الأطباء المعتمدون" : "Verified Doctors"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {doctors.map((doc: any) => (
              <article
                key={doc.id}
                style={{
                  border: "1px solid #E8EDEE",
                  borderRadius: "20px",
                  padding: "1.25rem",
                  background: "rgba(253,253,252,0.92)", backdropFilter: "blur(16px)" as any,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <VectorDoctor size={48} aria-hidden="true" />
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{doc.name_ar || doc.name_en || doc.name}</h3>
                  </div>
                  <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.9rem" }}>{doc.specialty}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#d97706", fontSize: "0.875rem", margin: "0.5rem 0" }}>
                    <Star size={14} fill="#d97706" />
                    <span>{doc.rating || 4.9}</span>
                  </div>
                </div>
                <Link
                  href={`/${locale}/consultations/book/${doc.id}`}
                  style={{
                    display: "inline-block",
                    textAlign: "center",
                    background: "#5FD9B3",
                    color: "#1E332E",
                    padding: "0.5rem 1rem",
                    borderRadius: "20px",
                    textDecoration: "none",
                    fontWeight: 500,
                    marginTop: "1rem",
                    fontSize: "0.875rem",
                  }}
                >
                  {locale === "ar" ? "احجز استشارة" : "Book Consultation"}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {facilities.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#1E332E" }}>
            {locale === "ar" ? "المراكز والمستشفيات في الحي والمنطقة" : "Clinics & Hospitals in Neighborhood"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {facilities.map((fac: any) => (
              <article
                key={fac.id}
                style={{
                  border: "1px solid #E8EDEE",
                  borderRadius: "20px",
                  padding: "1.25rem",
                  background: "rgba(253,253,252,0.92)", backdropFilter: "blur(16px)" as any,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Building2 size={18} color="#2563eb" />
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{fac.name_ar || fac.name_en}</h3>
                </div>
                <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <MapPin size={14} />
                  <span>{fac.district ? `${fac.district}, ${fac.city}` : fac.city}</span>
                </p>
                {fac.accepted_insurance?.length > 0 && (
                  <p style={{ margin: "0.5rem 0 0 0", color: "#059669", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <ShieldCheck size={14} />
                    <span>{fac.accepted_insurance.join(", ")}</span>
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
