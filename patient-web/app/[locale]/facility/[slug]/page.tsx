import { JsonLd } from "@/components-next/json-ld";
import { hospital, medicalClinic, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Building2, MapPin, Phone, ShieldCheck, Stethoscope } from "lucide-react";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string; slug: string }> };

async function getFacility(slug: string) {
  const res = await callPatientApi(`/entity-graph/related/facility/${encodeURIComponent(slug)}`, { next: { revalidate: 3600 } } as any);
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const data = await getFacility(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };
  const fac = data.entity;
  const name = locale === "ar" ? fac.name_ar || fac.name_en : fac.name_en || fac.name_ar;
  const canonical = localizedUrl(locale as Locale, `/facility/${encodeURIComponent(slug)}`);
  const desc = `${name} in ${fac.city || "Saudi Arabia"}. Specialized healthcare services, accepted insurances, and verified physicians.`;
  return { title: `${name} | Nabd Plus Healthcare`, description: desc, alternates: { canonical, languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/facility/${encodeURIComponent(slug)}`)])), "x-default": localizedUrl("ar", `/facility/${encodeURIComponent(slug)}`) } }, openGraph: { title: name, description: desc, url: canonical, type: "website" }, robots: { index: true, follow: true } };
}

export default async function FacilityCanonicalPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const data = await getFacility(slug);
  if (!data?.entity) notFound();
  const fac = data.entity;
  const rels = data.relationships || {};
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const name = locale === "ar" ? fac.name_ar || fac.name_en : fac.name_en || fac.name_ar;
  const isHospital = fac.type === "hospital";
  const schemaBuilder = isHospital ? hospital : medicalClinic;
  return (
    <main style={{ maxWidth: 896, margin: "0 auto", padding: "32px 16px", background: "#FDFDFC" }}>
      <JsonLd data={[schemaBuilder({ name, path: `/facility/${slug}`, locale: locale as Locale, city: fac.city, district: fac.district } as any), breadcrumbList([{ name: "Nabd Plus", locale: locale as Locale, path: "/" }, { name: locale === "ar" ? "المراكز والمستشفيات" : "Hospitals & Clinics", locale: locale as Locale, path: "/consultations/clinics" }, { name, locale: locale as Locale, path: `/facility/${slug}` }])]} />
      <nav aria-label="Back">
        <Link href={`/${locale}/consultations/clinics`} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, color: "#1E332E", textDecoration: "none", fontWeight: 600, overflowWrap: "anywhere" }}><Arrow size={16} />{locale === "ar" ? "قائمة المراكز والمستشفيات" : "Back to Facilities"}</Link>
      </nav>
      <article style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 32, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <header style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 20, background: "rgba(95,217,179,0.2)", color: "#1E332E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid #E8EDEE" }}><Building2 size={48} style={{ width: 24, height: 24 }} /></div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{name}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: "#1E332E", opacity: 0.7, fontSize: 14, marginTop: 8 }}>
              {fac.city ? <span style={{ display: "flex", alignItems: "center", gap: 4, overflowWrap: "anywhere" }}><MapPin size={16} />{fac.city} {fac.district ? `- ${fac.district}` : ""}</span> : null}
              {fac.phone ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={16} /><span dir="ltr">{fac.phone}</span></span> : null}
            </div>
          </div>
        </header>
        {rels.departments?.length ? (
          <section style={{ margin: "32px 0" }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 16px 0", color: "#1E332E", display: "flex", alignItems: "center", gap: 8 }}><Stethoscope size={48} style={{ width: 18, height: 18, color: "#1E332E", flexShrink: 0 }} />{locale === "ar" ? "الأقسام والتخصصات المتاحة" : "Available Specialties & Departments"}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{rels.departments.map((dept: string) => (<span key={dept} style={{ background: "#FDFDFC", color: "#1E332E", padding: "6px 14px", borderRadius: 20, fontSize: 14, border: "1px solid #E8EDEE", overflowWrap: "anywhere" }}>{dept}</span>))}</div>
          </section>
        ) : null}
        {fac.accepted_insurance?.length ? (
          <section style={{ margin: "32px 0", padding: 24, background: "rgba(255,255,255,0.7)", borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 16px 0", color: "#1E332E", display: "flex", alignItems: "center", gap: 8 }}><ShieldCheck size={48} style={{ width: 18, height: 18, color: "#1E332E", flexShrink: 0 }} />{locale === "ar" ? "التأمين الطبي المقبول" : "Accepted Medical Insurance"}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{fac.accepted_insurance.map((ins: string) => (<span key={ins} style={{ background: "rgba(95,217,179,0.15)", color: "#1E332E", padding: "4px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 500, border: "1px solid #E8EDEE", overflowWrap: "anywhere" }}>{ins}</span>))}</div>
          </section>
        ) : null}
        <Link href={`/${locale}/consultations`} style={{ display: "inline-flex", marginTop: 8, padding: "10px 20px", background: "#5FD9B3", color: "#1E332E", borderRadius: 20, textDecoration: "none", fontWeight: 600, border: "1px solid #E8EDEE" }}>{locale === "ar" ? "حجز موعد" : "Book Appointment"}</Link>
      </article>
    </main>
  );
}
