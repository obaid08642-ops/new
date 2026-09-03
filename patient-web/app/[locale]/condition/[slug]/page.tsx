import { JsonLd } from "@/components-next/json-ld";
import { medicalCondition, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Activity, AlertCircle, Pill, Stethoscope, UserCheck } from "lucide-react";

type Props = { params: Promise<{ locale: string; slug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchCondition(code: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/entity-graph/related/condition/${encodeURIComponent(code)}`, {
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
  const data = await fetchCondition(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };

  const name = locale === "ar" ? data.entity.name_ar : data.entity.name_en;
  const canonical = localizedUrl(locale as Locale, `/condition/${encodeURIComponent(slug)}`);
  const desc = locale === "ar" ? data.entity.overview_ar : data.entity.overview_en;

  return {
    title: `${name} | Nabd Plus Health Guide`,
    description: desc.slice(0, 160),
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/condition/${encodeURIComponent(slug)}`)])),
        "x-default": localizedUrl("ar", `/condition/${encodeURIComponent(slug)}`),
      },
    },
    openGraph: { title: name, description: desc, url: canonical, type: "article" },
    robots: { index: true, follow: true },
  };
}

export default async function ConditionCanonicalPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchCondition(slug);
  if (!data?.entity) notFound();

  const cond = data.entity;
  const rels = data.relationships || {};
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  const title = locale === "ar" ? cond.name_ar : cond.name_en;
  const overview = locale === "ar" ? cond.overview_ar : cond.overview_en;

  return (
    <main className="main" style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1rem" }}>
      <JsonLd
        data={[
          medicalCondition({
            name: title,
            path: `/condition/${slug}`,
            locale: locale as Locale,
            symptoms: cond.symptoms,
            overview,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: locale === "ar" ? "دليل الحالات الصحية" : "Health Guide", locale: locale as Locale, path: "/health" },
            { name: title, locale: locale as Locale, path: `/condition/${slug}` },
          ]),
        ]}
      />

      <nav aria-label="Back">
        <Link href={`/${locale}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", color: "#0066CC", textDecoration: "none", fontWeight: 500 }}>
          <Arrow size={16} />
          {locale === "ar" ? "الرئيسية" : "Home"}
        </Link>
      </nav>

      <article style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <header style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.75rem", background: "#f0fdf4", color: "#166534", borderRadius: "9999px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            <Activity size={14} />
            <span>{locale === "ar" ? "معلومات صحية موثقة" : "Verified Health Guide"}</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0, color: "#111827" }}>{title}</h1>
        </header>

        <section style={{ fontSize: "1.1rem", lineHeight: 1.7, color: "#374151", marginBottom: "2rem" }}>
          <p>{overview}</p>
        </section>

        {cond.symptoms?.length ? (
          <section style={{ margin: "2rem 0", padding: "1.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 600, margin: "0 0 1rem 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertCircle size={18} color="#0284c7" />
              {locale === "ar" ? "الأعراض والعلامات الشائعة" : "Common Symptoms"}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {cond.symptoms.map((sym: string) => (
                <span key={sym} style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", padding: "0.35rem 0.85rem", borderRadius: "6px", fontSize: "0.9rem" }}>
                  {sym}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {rels.doctors?.length ? (
          <section style={{ margin: "2rem 0" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 1rem 0", color: "#111827", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Stethoscope size={20} color="#0066CC" />
              {locale === "ar" ? "أطباء متاحون للاستشارة" : "Available Doctors"}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
              {rels.doctors.map((d: any) => (
                <Link
                  key={d.id}
                  href={`/${locale}/doctor/${d.slug || d.id}`}
                  style={{ display: "block", padding: "1rem", border: "1px solid #e5e7eb", borderRadius: "8px", textDecoration: "none", color: "inherit", background: "#fafafa" }}
                >
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.25rem 0", color: "#0066CC" }}>
                    {locale === "ar" ? (d.name_ar || d.name_en) : (d.name_en || d.name_ar)}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>{d.specialty}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {rels.relevant_medicines?.length ? (
          <section style={{ margin: "2rem 0" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 1rem 0", color: "#111827", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Pill size={20} color="#16a34a" />
              {locale === "ar" ? "أدوية مرتبطة مصرحة" : "Related Approved Medicines"}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
              {rels.relevant_medicines.map((m: any) => (
                <Link
                  key={m.sku || m.id}
                  href={`/${locale}/p/${encodeURIComponent(m.slug)}`}
                  style={{ display: "block", padding: "1rem", border: "1px solid #e5e7eb", borderRadius: "8px", textDecoration: "none", color: "inherit", background: "#fafafa" }}
                >
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 0.25rem 0", color: "#15803d" }}>
                    {locale === "ar" ? m.name_ar : (m.name_en || m.name_ar)}
                  </h3>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#4b5563" }}>{m.active_ingredient}</p>
                  {m.price ? <strong style={{ fontSize: "0.9rem", color: "#111827" }}>{m.price} SAR</strong> : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
