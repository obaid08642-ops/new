import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MapPin, ShieldCheck } from "lucide-react";

type Props = { params: Promise<{ locale: string; serviceSlug: string; citySlug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

type FeedItem = {
  id?: string;
  slug?: string;
  service_id?: string;
  name?: string;
  specialty?: string;
  serviceType?: string;
  facilityType?: string;
  city?: string;
  acceptedInsurance?: string[];
  url?: string;
  deepLink?: string;
};

type ResolvedCity = { latin: string; arabic: string; english: string };

async function resolveCity(citySlug: string): Promise<ResolvedCity | null> {
  const decoded = decodeURIComponent(citySlug).trim();
  if (!decoded) return null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/locations/cities`, {
      next: { revalidate: 21600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const list: any[] = Array.isArray(data) ? data : data?.data || [];
    const lowered = decoded.toLowerCase();
    const found = list.find((c: any) => {
      const latin = String(c.code || "").replace(/^sa-/, "").toLowerCase();
      return (
        latin === lowered ||
        String(c.name_en || "").toLowerCase() === lowered ||
        String(c.name_ar || "") === decoded
      );
    });
    if (!found || !found.name_ar) return null;
    return {
      latin: String(found.code || "").replace(/^sa-/, "").toLowerCase() || lowered,
      arabic: String(found.name_ar),
      english: String(found.name_en || found.name_ar),
    };
  } catch {
    return null;
  }
}

function itemKey(item: FeedItem): string[] {
  // Identifiers the sitemap emits for this row (feed rows carry `id`;
  // slug/service_id are accepted for forward-compatibility).
  const keys: string[] = [];
  for (const raw of [item.id, item.slug, item.service_id]) {
    if (raw) keys.push(String(raw).toLowerCase());
  }
  // The feed also advertises each row's canonical page (/doctor/<slug>,
  // /facility/<slug>); accept that trailing segment too.
  for (const raw of [item.url, item.deepLink]) {
    if (raw) {
      const seg = String(raw).split("?")[0].split("/").filter(Boolean).pop();
      if (seg) keys.push(seg.toLowerCase());
    }
  }
  return keys;
}

async function fetchNamedProvider(
  serviceSlug: string,
  city: ResolvedCity,
  locale: string,
): Promise<{ item: FeedItem; city: ResolvedCity } | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/public/ai-catalog/services?city=${encodeURIComponent(city.arabic)}&locale=${encodeURIComponent(locale)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const items: FeedItem[] = json.items || [];
    // Q33: never fall back to the full list. A URL renders if and only if
    // the feed for THIS city contains the NAMED provider.
    const slug = decodeURIComponent(serviceSlug).toLowerCase();
    const matched = items.find((item) => itemKey(item).includes(slug));
    if (!matched) return null;
    return { item: matched, city };
  } catch {
    return null;
  }
}

function providerPath(item: FeedItem, locale: string): string {
  // Link the CTA to the provider's own page, never a generic list.
  for (const raw of [item.url, item.deepLink]) {
    if (!raw) continue;
    try {
      const path = new URL(String(raw)).pathname.replace(/^\/(ar|en|ur|hi|bn|fil)(?=\/)/, "");
      if (path && path !== "/") return `/${locale}${path}`;
    } catch {
      /* ignore malformed advertised URLs */
    }
  }
  return `/${locale}/consultations`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, serviceSlug, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const city = await resolveCity(citySlug);
  if (!city) {
    return { robots: { index: false, follow: false } };
  }
  const found = await fetchNamedProvider(serviceSlug, city, locale);

  if (!found) {
    return { robots: { index: false, follow: false } };
  }

  const name = found.item.name || decodeURIComponent(serviceSlug);
  const cityName = locale === "ar" ? city.arabic : city.english;

  const canonical = localizedUrl(
    locale as Locale,
    `/services/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`,
  );
  const title = locale === "ar"
    ? `${name} في ${cityName} | حجز مباشر`
    : `${name} in ${cityName} | Book now`;
  const kind = found.item.specialty || found.item.serviceType || found.item.facilityType;
  const desc = locale === "ar"
    ? `${name}${kind ? ` — ${kind}` : ""} في ${cityName}. احجز عبر منصة نبضة بلس.`
    : `${name}${kind ? ` — ${kind}` : ""} in ${cityName}. Book via Nabd Plus.`;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/services/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/services/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function ServiceCityPage({ params }: Props) {
  const { locale, serviceSlug, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const city = await resolveCity(citySlug);
  if (!city) {
    notFound();
  }
  const found = await fetchNamedProvider(serviceSlug, city, locale);
  if (!found) {
    notFound();
  }

  const svc = found.item;
  const name = svc.name || decodeURIComponent(serviceSlug);
  const cityName = locale === "ar" ? city.arabic : city.english;
  const kind = svc.specialty || svc.serviceType || svc.facilityType;
  const pageTitle = locale === "ar" ? `${name} في ${cityName}` : `${name} in ${cityName}`;

  return (
    <main className="main" style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem" }}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/services/${serviceSlug}/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: locale === "ar" ? "الخدمات" : "Services", locale: locale as Locale, path: "/services" },
            { name, locale: locale as Locale, path: `/services/${serviceSlug}/${citySlug}` },
          ]),
        ]}
      />

      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#111827" }}>{pageTitle}</h1>
        <p style={{ color: "#4b5563", fontSize: "1rem", margin: 0 }}>
          {locale === "ar"
            ? `${kind ? `${kind} — ` : ""}احجز ${name} في ${cityName} عبر منصة نبضة بلس.`
            : `${kind ? `${kind} — ` : ""}Book ${name} in ${cityName} via Nabd Plus.`}
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        <article
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            backgroundColor: "#fff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: 600 }}>{name}</h2>
            {kind && (
              <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.875rem" }}>{kind}</p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#374151", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              <MapPin size={14} />
              <span>{cityName}</span>
            </div>
            {svc.acceptedInsurance && svc.acceptedInsurance.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#059669", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                <ShieldCheck size={14} />
                <span>{svc.acceptedInsurance.join(", ")}</span>
              </div>
            )}
          </div>
          <Link
            href={providerPath(svc, locale)}
            style={{
              display: "inline-block",
              textAlign: "center",
              backgroundColor: "#059669",
              color: "#fff",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontWeight: 500,
              marginTop: "1rem",
              fontSize: "0.875rem",
            }}
          >
            {locale === "ar" ? "طلب الخدمة" : "Book Service"}
          </Link>
        </article>
      </section>
    </main>
  );
}
