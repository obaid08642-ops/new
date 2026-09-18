import { JsonLd } from "@/components-next/json-ld";
import { medicalCondition, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Activity, AlertCircle, Pill, Stethoscope } from "lucide-react";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string; slug: string }> };

async function getCondition(code: string) {
  const res = await callPatientApi(`/entity-graph/related/condition/${encodeURIComponent(code)}`, { next: { revalidate: 3600 } } as any);
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const data = await getCondition(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };
  const name = locale === "ar" ? data.entity.name_ar : data.entity.name_en;
  const canonical = localizedUrl(locale as Locale, `/condition/${encodeURIComponent(slug)}`);
  const desc = (locale === "ar" ? data.entity.overview_ar : data.entity.overview_en) || "";
  return {
    title: `${name} | Nabd Plus Health Guide`,
    description: desc.slice(0, 160),
    alternates: { canonical, languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/condition/${encodeURIComponent(slug)}`)] )), "x-default": localizedUrl("ar", `/condition/${encodeURIComponent(slug)}`) } },
    openGraph: { title: name, description: desc, url: canonical, type: "article" },
    robots: { index: true, follow: true },
  };
}

export default async function ConditionCanonicalPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const data = await getCondition(slug);
  if (!data?.entity) notFound();
  const cond = data.entity;
  const rels = data.relationships || {};
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const title = locale === "ar" ? cond.name_ar : cond.name_en;
  const overview = locale === "ar" ? cond.overview_ar : cond.overview_en;

  return (
    <main style={{ maxWidth: 896, margin: "0 auto", padding: "32px 16px", background: "#FDFDFC" }}>
      <JsonLd data={[medicalCondition({ name: title, path: `/condition/${slug}`, locale: locale as Locale, symptoms: cond.symptoms, overview }), breadcrumbList([{ name: "Nabd Plus", locale: locale as Locale, path: "/" }, { name: locale === "ar" ? "دليل الحالات الصحية" : "Health Guide", locale: locale as Locale, path: "/health" }, { name: title, locale: locale as Locale, path: `/condition/${slug}` }])]} />
      <nav aria-label="Back">
        <Link href={`/${locale}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, color: "#1E332E", textDecoration: "none", fontWeight: 600, overflowWrap: "anywhere" }}>
          <Arrow size={16} />{locale === "ar" ? "الرئيسية" : "Home"}
        </Link>
      </nav>
      <article style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 32, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <header style={{ marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", background: "rgba(95,217,179,0.18)", color: "#1E332E", borderRadius: 9999, fontSize: 13, fontWeight: 600, marginBottom: 16, border: "1px solid #E8EDEE" }}>
            <Activity size={48} style={{ width: 16, height: 16 }} /><span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{locale === "ar" ? "معلومات صحية موثقة" : "Verified Health Guide"}</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title}</h1>
        </header>
        <section style={{ fontSize: "1.05rem", lineHeight: 1.7, color: "#1E332E", marginBottom: 32, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}><p style={{ margin: 0 }}>{overview}</p></section>

        {cond.symptoms?.length ? (
          <section style={{ margin: "32px 0", padding: 24, background: "rgba(255,255,255,0.7)", borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 16px 0", color: "#1E332E", display: "flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" }}><AlertCircle size={48} style={{ width: 20, height: 20, color: "#1E332E", flexShrink: 0 }} />{locale === "ar" ? "الأعراض والعلامات الشائعة" : "Common Symptoms"}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {cond.symptoms.map((sym: string) => (<span key={sym} style={{ background: "#FDFDFC", border: "1px solid #E8EDEE", color: "#1E332E", padding: "6px 14px", borderRadius: 20, fontSize: 14, overflowWrap: "anywhere" }}>{sym}</span>))}
            </div>
          </section>
        ) : null}

        {rels.doctors?.length ? (
          <section style={{ margin: "32px 0" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 16px 0", color: "#1E332E", display: "flex", alignItems: "center", gap: 8 }}><Stethoscope size={48} style={{ width: 20, height: 20, color: "#1E332E", flexShrink: 0 }} />{locale === "ar" ? "أطباء متاحون للاستشارة" : "Available Doctors"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {rels.doctors.map((d: any) => (
                <Link key={d.id} href={`/${locale}/doctor/${d.slug || d.id}`} style={{ display: "block", padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, textDecoration: "none", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(16px)" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px 0", color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{locale === "ar" ? d.name_ar || d.name_en : d.name_en || d.name_ar}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#1E332E", opacity: 0.7, overflowWrap: "anywhere" }}>{d.specialty}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {rels.relevant_medicines?.length ? (
          <section style={{ margin: "32px 0" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 16px 0", color: "#1E332E", display: "flex", alignItems: "center", gap: 8 }}><Pill size={48} style={{ width: 20, height: 20, color: "#1E332E", flexShrink: 0 }} />{locale === "ar" ? "أدوية مرتبطة مصرحة" : "Related Approved Medicines"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {rels.relevant_medicines.map((m: any) => (
                <Link key={m.sku || m.id} href={`/${locale}/p/${encodeURIComponent(m.slug)}`} style={{ display: "block", padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, textDecoration: "none", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(16px)" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px 0", color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{locale === "ar" ? m.name_ar : m.name_en || m.name_ar}</h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#1E332E", opacity: 0.7, overflowWrap: "anywhere" }}>{m.active_ingredient}</p>
                  {m.price ? <strong style={{ fontSize: 14, color: "#1E332E" }}>{m.price} SAR</strong> : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <Link href={`/${locale}/consultations`} style={{ display: "inline-flex", marginTop: 24, padding: "10px 20px", background: "#5FD9B3", color: "#1E332E", borderRadius: 20, textDecoration: "none", fontWeight: 600, border: "1px solid #E8EDEE" }}>{locale === "ar" ? "حجز استشارة" : "Book Consultation"}</Link>
      </article>
    </main>
  );
}
