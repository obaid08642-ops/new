import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, RefreshCw, Search, Stethoscope } from "lucide-react";
import { extractSpecialties } from "@/lib/api/specialties";
import { getPublicSpecialties } from "@/lib/api/specialties-server";
import { isLocale } from "@/lib/i18n";
import { JsonLd } from "@/components-next/json-ld";
import { hubMetadata } from "@/lib/seo";
import { VectorDoctor } from "@/components-next/vector-illustrations";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string }> };


export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/consultations/specialties", t("consultations/specialties.title"), t("consultations/specialties.description"));
}

export default async function SpecialtySelectPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Specialties");
  const response = await getPublicSpecialties();
  const isRtl = locale === "ar" || locale === "ur";
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  if (!response || !response.ok) {
    return (
      <main className="main" style={{ maxWidth: 980, margin: "0 auto", padding: "32px 16px 80px", background: "#FDFDFC" }}>
        <section role="alert" style={{ display: "grid", justifyItems: "center", gap: 16, padding: "48px 24px", textAlign: "center", border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
          <span style={{ display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: 20, background: "rgba(95,217,179,0.12)", border: "1px solid #E8EDEE" }}><Stethoscope size={28} color="#1E332E" aria-hidden="true" /></span>
          <h1 style={{ margin: 0, color: "#1E332E", fontSize: "1.4rem", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("unavailableTitle")}</h1>
          <p style={{ margin: 0, color: "#6B7C6E", lineHeight: 1.6, overflowWrap: "anywhere" }}>{t("unavailableBody")}</p>
          <Link href={`/${locale}/consultations/specialties`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", color: "#1E332E", background: "#5FD9B3", borderRadius: 20, fontWeight: 800, textDecoration: "none" }}>
            <RefreshCw size={16} aria-hidden="true" />{t("retry")}
          </Link>
        </section>
      </main>
    );
  }

  const specialties = extractSpecialties(await response.json().catch(() => null));
  const query = q.trim().toLocaleLowerCase(locale);
  const filtered = specialties.filter((specialty) => [specialty.nameAr, specialty.nameEn, specialty.slug].filter(Boolean).some((value) => value!.toLocaleLowerCase(locale).includes(query)));
  const faqs: Array<{ q: string; a: string }> = t.raw("faq") as any;
  return (
    <main className="main" style={{ maxWidth: 980, margin: "0 auto", padding: "32px 16px 80px", background: "#FDFDFC" }}>
      <JsonLd data={[{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]} />
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "clamp(28px, 4vw, 36px)", border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 10px 28px rgba(16,24,40,.07)", marginBottom: 24 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: 0, color: "#1E332E", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", background: "rgba(95,217,179,0.14)", padding: "5px 12px", borderRadius: 999, overflowWrap: "anywhere" }}>
            <Stethoscope size={15} aria-hidden="true" />{t("eyebrow")}
          </p>
          <h1 style={{ margin: "0.4rem 0 0", color: "#1E332E", fontSize: "clamp(1.8rem, 3.2vw, 2.4rem)", letterSpacing: "-0.035em", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("title")}</h1>
          <p style={{ margin: "0.5rem 0 0", color: "#6B7C6E", fontSize: "0.94rem", lineHeight: 1.6, overflowWrap: "anywhere" }}>{t("subtitle")}</p>
        </div>
        <div style={{ display: "grid", placeItems: "center", flex: "0 0 auto", width: 76, height: 76, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(95,217,179,0.12)", boxShadow: "0 10px 24px rgba(30,51,46,0.06)" }}>
          <VectorDoctor size={48} aria-hidden="true" />
        </div>
      </section>

      <form method="get" role="search" style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 24px", padding: "0 16px", border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 22px rgba(30,51,46,.06)" }}>
        <Search size={18} color="#6B7C6E" aria-hidden="true" />
        <label className="sr-only" htmlFor="specialty-search">{t("searchLabel")}</label>
        <input id="specialty-search" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} style={{ width: "100%", padding: "16px 0", color: "#1E332E", font: "inherit", border: 0, outline: 0, background: "transparent" }} />
      </form>

      {filtered.length === 0 ? (
        <section style={{ display: "grid", justifyItems: "center", gap: 12, padding: "48px 24px", textAlign: "center", border: "1px dashed #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
          <span style={{ display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: 20, background: "rgba(95,217,179,0.10)", border: "1px solid #E8EDEE" }}><Search size={26} color="#6B7C6E" aria-hidden="true" /></span>
          <h2 style={{ margin: 0, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("emptyTitle")}</h2>
          <p style={{ margin: 0, color: "#6B7C6E", lineHeight: 1.6, overflowWrap: "anywhere" }}>{specialties.length === 0 ? t("emptyBody") : t("noMatch")}</p>
        </section>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }} aria-label={t("title")}>
          {filtered.map((specialty, index) => {
            const name = locale === "ar" || locale === "ur" ? specialty.nameAr ?? specialty.nameEn : specialty.nameEn ?? specialty.nameAr;
            const color = ["#1E332E", "#5FD9B3", "#6B7C6E", "#1E332E", "#5FD9B3", "#6B7C6E"][index % 6];
            return (
              <Link key={specialty.slug ?? `${name}-${index}`} href={`/${locale}/appointments?specialty=${encodeURIComponent(specialty.nameAr ?? specialty.nameEn ?? "")}`} style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 22px rgba(30,51,46,.06)", textDecoration: "none", color: "inherit" }}>
                <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, flex: "0 0 auto", borderRadius: 16, color, background: `${color}14`, border: "1px solid #E8EDEE" }}><Stethoscope size={22} aria-hidden="true" /></span>
                <span style={{ display: "flex", flex: 1, flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <strong style={{ color: "#1E332E", fontSize: 16, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{name}</strong>
                  {specialty.count !== undefined ? <small style={{ color: "#6B7C6E", fontSize: 12 }}>{t("doctorCount", { count: specialty.count })}</small> : null}
                </span>
                <Arrow size={18} color="#1E332E" aria-hidden="true" />
              </Link>
            );
          })}
        </section>
      )}

      <section style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24 }} aria-label={t("faqTitle")}>
        <h2 style={{ margin: "0 0 16px", color: "#1E332E", fontSize: "1.2rem", overflowWrap: "anywhere" }}>{t("faqTitle")}</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {faqs.map((f, i) => (
            <details key={i} style={{ border: "1px solid #E8EDEE", borderRadius: 20, padding: "12px 16px", background: "#FDFDFC" }}>
              <summary style={{ color: "#1E332E", fontWeight: 700, cursor: "pointer", overflowWrap: "anywhere" }}>{f.q}</summary>
              <p style={{ margin: "8px 0 0", color: "#6B7C6E", lineHeight: 1.6, overflowWrap: "anywhere" }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
