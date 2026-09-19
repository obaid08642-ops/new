import { JsonLd } from "@/components-next/json-ld";
import { physician, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl, siteOrigin } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Clock3, Star } from "lucide-react";
import { VectorDoctor } from "@/components-next/vector-illustrations";

type Props = { params: Promise<{ locale: string; slug: string; city?: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchDoctor(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/entity-graph/related/doctor/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, city } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchDoctor(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };

  const name = locale === "ar" ? (data.entity.name_ar || data.entity.name_en) : (data.entity.name_en || data.entity.name_ar);
  const citySuffix = city ? `/${encodeURIComponent(city)}` : "";
  const canonical = localizedUrl(locale as Locale, `/doctor/${encodeURIComponent(slug)}${citySuffix}`);
  const specialty = data.entity.specialty || "Doctor";
  const cityName = city ? decodeURIComponent(city) : "";
  const desc = cityName
    ? `${name} - ${specialty} in ${cityName}. Book appointment online or clinic consultation via Nabd Plus.`
    : `${name} - ${specialty} in Nabd Plus Saudi Healthcare. Book appointment online or clinic consultation.`;

  return {
    title: city ? `${name} | ${specialty} | ${decodeURIComponent(city)}` : `${name} | ${specialty}`,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/doctor/${encodeURIComponent(slug)}${citySuffix}`)])),
        "x-default": localizedUrl("ar", `/doctor/${encodeURIComponent(slug)}${citySuffix}`),
      },
    },
    openGraph: { title: name, description: desc, url: canonical, type: "profile" },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorCanonicalPage({ params }: Props) {
  const { locale, slug, city } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchDoctor(slug);
  if (!data?.entity) notFound();

  const doctor = data.entity;
  const relationships = data.relationships || {};
  const facility = relationships.facility;
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  const doctorName = locale === "ar" ? (doctor.name_ar || doctor.name_en) : (doctor.name_en || doctor.name_ar);
  const facilityName = facility ? (locale === "ar" ? (facility.name_ar || facility.name_en) : (facility.name_en || facility.name_ar)) : null;
  const cityName = city ? decodeURIComponent(city) : null;
  const doctorPath = `/doctor/${slug}${city ? `/${encodeURIComponent(city)}` : ""}`;

  return (
    <main className="main" style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1rem", background: "#FDFDFC" }}>
      <JsonLd
        data={[
          physician({
            name: doctorName,
            path: doctorPath,
            locale: locale as Locale,
            specialty: doctor.specialty || null,
            city: cityName,
            ratingValue: doctor.rating_avg ?? doctor.rating ?? null,
            reviewCount: doctor.reviews_count ?? null,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: doctor.specialty || "Doctors", locale: locale as Locale, path: "/consultations/doctors" },
            { name: doctorName, locale: locale as Locale, path: doctorPath },
          ]),
        ]}
      />

        <nav aria-label="Back">
        <Link href={`/${locale}/consultations/doctors`} style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "24px", color: "#1E332E", textDecoration: "none", fontWeight: 500 }}>
          <Arrow size={16} />
          {locale === "ar" ? "العودة لقائمة الأطباء" : "Back to Doctors"}
        </Link>
      </nav>

      <article style={{ background: "rgba(253,253,252,0.92)", border: "1px solid #E8EDEE", borderRadius: "20px", padding: "2rem", boxShadow: "0 8px 24px rgba(30,51,46,.06)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <header style={{ display: "flex", gap: "24px", alignItems: "flex-start", marginBottom: "24px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "rgba(95,217,179,0.12)", border: "1px solid #E8EDEE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <VectorDoctor size={48} aria-hidden="true" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{doctorName}</h1>
              <BadgeCheck size={20} color="#00876F" />
            </div>
            <p style={{ color: "#1E332E", margin: "0.25rem 0 0.5rem 0", fontSize: "1.1rem", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{doctor.specialty}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", color: "#6b7280", fontSize: "0.9rem" }}>
              {doctor.rating ? (
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Star size={16} color="#eab308" fill="#eab308" />
                  <strong>{doctor.rating}</strong>
                </span>
              ) : null}
              {doctor.experience_years ? (
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Clock3 size={16} />
                  <span>{doctor.experience_years} {locale === "ar" ? "سنوات خبرة" : "years experience"}</span>
                </span>
              ) : null}
              {facilityName ? (
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Building2 size={16} />
                  <span style={{overflowWrap:"anywhere", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden"}}>{facilityName}</span>
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {relationships.accepted_insurance?.length ? (
          <section style={{ margin: "24px 0", padding: "16px", background: "rgba(253,253,252,0.92)", border: "1px solid #E8EDEE", borderRadius: "20px", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 12px 0", color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
              {locale === "ar" ? "شركات التأمين المقبولة" : "Accepted Insurance Companies"}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {relationships.accepted_insurance.map((ins: string) => (
                <span key={ins} style={{ background: "#E8EDEE", color: "#1E332E", padding: "4px 12px", borderRadius: "9999px", fontSize: "0.85rem", fontWeight: 500, textTransform: "uppercase", overflowWrap: "anywhere" }}>
                  {ins}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div style={{ marginTop: "32px", display: "flex", gap: "16px" }}>
          <Link
            href={`/${locale}/consultations/doctors/${doctor.id || slug}`}
            style={{ display: "inline-block", background: "#5FD9B3", color: "#1E332E", padding: "12px 32px", borderRadius: "20px", fontWeight: 700, textDecoration: "none", border: "1px solid #E8EDEE" }}
          >
            {locale === "ar" ? "حجز استشارة فورية" : "Book Consultation"}
          </Link>
        </div>
      </article>
    </main>
  );
}
