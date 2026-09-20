import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, nursingService } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CheckCircle2, HeartHandshake, Home, MapPin, ShieldCheck } from "lucide-react";
import { VectorNursing } from "@/components-next/vector-illustrations";

type Props = { params: Promise<{ locale: string; citySlug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchNursingData(citySlug: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/public/ai-catalog/services?city=${encodeURIComponent(citySlug)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const items = json.items || [];
    const nursingItems = items.filter((item: any) =>
      item.service_mode?.toLowerCase().includes("home") ||
      item.name?.toLowerCase().includes("nursing") ||
      item.name?.includes("تمريض") ||
      item.name?.includes("منزل")
    );
    return {
      services: nursingItems.length > 0 ? nursingItems : items.slice(0, 5),
      city: json.city || decodeURIComponent(citySlug),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchNursingData(citySlug);

  if (!data || data.services.length === 0) {
    return { robots: { index: false, follow: false } };
  }

  const decCity = decodeURIComponent(citySlug);

  const canonical = localizedUrl(
    locale as Locale,
    `/home-nursing/${encodeURIComponent(citySlug)}`,
  );
  const title = locale === "ar"
    ? `تمريض منزلي في ${decCity} | رعاية صحية منزلية مرخصة 24/7`
    : `Home Nursing Services in ${decCity} | Licensed Care 24/7`;
  const desc = locale === "ar"
    ? `احجز خدمات تمريض منزلي ورعاية كبار السن والمصابين في ${decCity} عبر طاقم تمريضي مرخص وموثق من نبضة بلس.`
    : `Verified and licensed home nursing care in ${decCity}. Senior care, post-op, and daily assistance via Nabd Plus.`;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/home-nursing/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/home-nursing/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function HomeNursingCityPage({ params }: Props) {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchNursingData(citySlug);
  if (!data || data.services.length === 0) {
    notFound();
  }

  const decCity = decodeURIComponent(citySlug);
  const services = data.services;

  const pageTitle = locale === "ar"
    ? `خدمات التمريض المنزلي في ${decCity}`
    : `Home Nursing Services in ${decCity}`;

  return (
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16, padding: 16 }}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/home-nursing/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: "Home Care", locale: locale as Locale, path: "/home-care/services" },
            { name: decCity, locale: locale as Locale, path: `/home-nursing/${citySlug}` },
          ]),
          nursingService({
            name: pageTitle,
            path: `/home-nursing/${citySlug}`,
            locale: locale as Locale,
            description: `Licensed home nursing and medical visit services in ${decCity}`,
          }),
        ]}
      />

      <section style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}><div style={{ minWidth: 0 }}><p style={{ color: "#1E332E", fontWeight: 800, fontSize: 12, letterSpacing: "0.06em", overflowWrap: "anywhere", display: "inline-flex", alignItems: "center", gap: 8 } as React.CSSProperties}><MapPin size={14} aria-hidden="true" />{locale === "ar" ? "التمريض المنزلي" : "Home Nursing"}</p><h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{pageTitle}</h1><p style={{ color: "#6B7C6E", fontSize: "1rem", margin: 0, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{locale === "ar" ? `طواقم تمريضية مرخصة من وزارة الصحة لتقديم الرعاية الطبية في منزلك في ${decCity}.` : `Licensed medical nurses delivering professional healthcare at your home in ${decCity}.`}</p></div><span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties} aria-hidden="true"><VectorNursing size={48} aria-hidden="true" /></span></section><header style={{ display: "none" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{pageTitle}</h1>
        <p style={{ color: "#6B7C6E", fontSize: "1rem", margin: 0 }}>
          {locale === "ar"
            ? `طواقم تمريضية مرخصة من وزارة الصحة لتقديم الرعاية الطبية في منزلك في ${decCity}.`
            : `Licensed medical nurses delivering professional healthcare at your home in ${decCity}.`}
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {services.map((svc: any, idx: number) => (
          <article
            key={svc.service_id || idx}
            style={{
              border: "1px solid #E8EDEE",
              borderRadius: 20,
              padding: "1.25rem",
              background: "rgba(255,255,255,.82)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <HeartHandshake size={18} color="#5FD9B3" />
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>{svc.name}</h2>
              </div>
              <p style={{ margin: "0.25rem 0", color: "#6B7C6E", fontSize: "0.875rem" }}>{svc.description}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#5FD9B3", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                <CheckCircle2 size={14} />
                <span>{locale === "ar" ? "مرخص ومعتمد" : "Licensed Staff"}</span>
              </div>
            </div>
            <Link
              href={`/${locale}/home-care/services`}
              style={{
                display: "inline-block",
                textAlign: "center",
                background: "#5FD9B3",
                color: "#1E332E",
                padding: "0.5rem 1rem",
                borderRadius: 20,
                textDecoration: "none", border: "1px solid #E8EDEE",
                fontWeight: 500,
                marginTop: "1rem",
                fontSize: "0.875rem",
              }}
            >
              {locale === "ar" ? "طلب زيارة منزلية" : "Request Visit"}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
