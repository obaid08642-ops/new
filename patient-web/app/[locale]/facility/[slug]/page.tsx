import { JsonLd } from "@/components-next/json-ld";
import { hospital, medicalClinic, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Building2, MapPin, Phone, ShieldCheck, Stethoscope } from "lucide-react";

type Props = { params: Promise<{ locale: string; slug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchFacility(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/entity-graph/related/facility/${encodeURIComponent(slug)}`, {
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
  const data = await fetchFacility(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };

  const fac = data.entity;
  const name = locale === "ar" ? (fac.name_ar || fac.name_en) : (fac.name_en || fac.name_ar);
  const canonical = localizedUrl(locale as Locale, `/facility/${encodeURIComponent(slug)}`);
  const desc = `${name} in ${fac.city || "Saudi Arabia"}. Specialized healthcare services, accepted insurances, and verified physicians.`;

  return {
    title: `${name} | Nabd Plus Healthcare`,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/facility/${encodeURIComponent(slug)}`)])),
        "x-default": localizedUrl("ar", `/facility/${encodeURIComponent(slug)}`),
      },
    },
    openGraph: { title: name, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function FacilityCanonicalPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchFacility(slug);
  if (!data?.entity) notFound();

  const fac = data.entity;
  const rels = data.relationships || {};
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  const name = locale === "ar" ? (fac.name_ar || fac.name_en) : (fac.name_en || fac.name_ar);
  const isHospital = fac.type === "hospital";

  const schemaBuilder = isHospital ? hospital : medicalClinic;

  return (
    <main className="main" style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1rem" }}>
      <JsonLd
        data={[
          schemaBuilder({
            name,
            path: `/facility/${slug}`,
            locale: locale as Locale,
            city: fac.city,
            district: fac.district,
          } as any),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: locale === "ar" ? "المراكز والمستشفيات" : "Hospitals & Clinics", locale: locale as Locale, path: "/consultations/clinics" },
            { name, locale: locale as Locale, path: `/facility/${slug}` },
          ]),
        ]}
      />

      <nav aria-label="Back">
        <Link href={`/${locale}/consultations/clinics`} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", color: "#0066CC", textDecoration: "none", fontWeight: 500 }}>
          <Arrow size={16} />
          {locale === "ar" ? "قائمة المراكز والمستشفيات" : "Back to Facilities"}
        </Link>
      </nav>

      <article style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <header style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "12px", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Building2 size={36} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, color: "#111827" }}>{name}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", color: "#6b7280", fontSize: "0.95rem", marginTop: "0.5rem" }}>
              {fac.city ? (
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <MapPin size={16} />
                  <span>{fac.city} {fac.district ? `- ${fac.district}` : ""}</span>
                </span>
              ) : null}
              {fac.phone ? (
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Phone size={16} />
                  <span dir="ltr">{fac.phone}</span>
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {rels.departments?.length ? (
          <section style={{ margin: "2rem 0" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 600, margin: "0 0 0.75rem 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Stethoscope size={18} color="#0066CC" />
              {locale === "ar" ? "الأقسام والتخصصات المتاحة" : "Available Specialties & Departments"}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {rels.departments.map((dept: string) => (
                <span key={dept} style={{ background: "#f1f5f9", color: "#334155", padding: "0.35rem 0.85rem", borderRadius: "6px", fontSize: "0.9rem" }}>
                  {dept}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {fac.accepted_insurance?.length ? (
          <section style={{ margin: "2rem 0", padding: "1.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.75rem 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={18} color="#16a34a" />
              {locale === "ar" ? "التأمين الطبي المقبول" : "Accepted Medical Insurance"}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {fac.accepted_insurance.map((ins: string) => (
                <span key={ins} style={{ background: "#e2e8f0", color: "#1e293b", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.85rem", fontWeight: 500, textTransform: "uppercase" }}>
                  {ins}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
