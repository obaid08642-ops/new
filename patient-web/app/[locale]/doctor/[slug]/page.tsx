import { JsonLd } from "@/components-next/json-ld";
import { physician, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl, siteOrigin } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Clock3, Star, Stethoscope } from "lucide-react";

type Props = { params: Promise<{ locale: string; slug: string }> };

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
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchDoctor(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };

  const name = locale === "ar" ? (data.entity.name_ar || data.entity.name_en) : (data.entity.name_en || data.entity.name_ar);
  const canonical = localizedUrl(locale as Locale, `/doctor/${encodeURIComponent(slug)}`);
  const specialty = data.entity.specialty || "Doctor";
  const desc = `${name} - ${specialty} in Nabd Plus Saudi Healthcare. Book appointment online or clinic consultation.`;

  return {
    title: `${name} | ${specialty}`,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/doctor/${encodeURIComponent(slug)}`)])),
        "x-default": localizedUrl("ar", `/doctor/${encodeURIComponent(slug)}`),
      },
    },
    openGraph: { title: name, description: desc, url: canonical, type: "profile" },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorCanonicalPage({ params }: Props) {
  const { locale, slug } = await params;
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

  return (
    <main className="main" style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1rem" }}>
      <JsonLd
        data={[
          physician({
            name: doctorName,
            path: `/doctor/${slug}`,
            locale: locale as Locale,
            specialty: doctor.specialty || null,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: doctor.specialty || "Doctors", locale: locale as Locale, path: "/consultations/doctors" },
            { name: doctorName, locale: locale as Locale, path: `/doctor/${slug}` },
          ]),
        ]}
      />

      <nav aria-label="Back">
        <Link href={`/${locale}/consultations/doctors`} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", color: "#0066CC", textDecoration: "none", fontWeight: 500 }}>
          <Arrow size={16} />
          {locale === "ar" ? "العودة لقائمة الأطباء" : "Back to Doctors"}
        </Link>
      </nav>

      <article style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <header style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Stethoscope size={36} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, color: "#111827" }}>{doctorName}</h1>
              <BadgeCheck size={20} color="#0284c7" />
            </div>
            <p style={{ color: "#4b5563", margin: "0.25rem 0 0.5rem 0", fontSize: "1.1rem" }}>{doctor.specialty}</p>
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
                  <span>{facilityName}</span>
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {relationships.accepted_insurance?.length ? (
          <section style={{ margin: "1.5rem 0", padding: "1rem", background: "#f8fafc", borderRadius: "8px" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.75rem 0", color: "#1e293b" }}>
              {locale === "ar" ? "شركات التأمين المقبولة" : "Accepted Insurance Companies"}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {relationships.accepted_insurance.map((ins: string) => (
                <span key={ins} style={{ background: "#e2e8f0", color: "#334155", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.85rem", fontWeight: 500, textTransform: "uppercase" }}>
                  {ins}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
          <Link
            href={`/${locale}/consultations/doctors/${doctor.id || slug}`}
            style={{ display: "inline-block", background: "#0066CC", color: "#ffffff", padding: "0.75rem 2rem", borderRadius: "8px", fontWeight: 600, textDecoration: "none" }}
          >
            {locale === "ar" ? "حجز استشارة فورية" : "Book Consultation"}
          </Link>
        </div>
      </article>
    </main>
  );
}
