import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MapPin, ShieldCheck } from "lucide-react";
import { findNamedService, type ServiceFeedItem } from "@/lib/seo/service-city";
import { nabdUrlToWebPath } from "@/lib/deep-links/nabd-links";

type Props = { params: Promise<{ locale: string; serviceSlug: string; citySlug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

// Q33: the shared resolver (also used by proxy.ts for the real 404 and by the
// services sitemap): the named service must be listed, by slug, in that city.
const cachedFetch = (url: string) => fetch(url, { next: { revalidate: 3600 } });

function providerPath(item: ServiceFeedItem, locale: string): string {
  // Link the CTA to the provider's own page, never a generic list.
  if (item.url) {
    try {
      const path = new URL(String(item.url)).pathname.replace(/^\/(ar|en|ur|hi|bn|fil)(?=\/)/, "");
      if (path && path !== "/") return `/${locale}${path}`;
    } catch {
      /* ignore malformed advertised URLs */
    }
  }
  // R18: an app link (nabdplus://facility/x) maps to its website page via nabd-links.
  const fromAppLink = nabdUrlToWebPath(item.deepLink);
  if (fromAppLink) return /^\/(ar|en|ur|hi|bn|fil)\//.test(fromAppLink) ? fromAppLink : `/${locale}${fromAppLink}`;
  return `/${locale}/consultations`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, serviceSlug, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const found = await findNamedService(API_BASE, serviceSlug, citySlug, locale, cachedFetch).catch(() => null);
  if (!found) {
    return { robots: { index: false, follow: false } };
  }

  const name = String(found.item.name);
  const cityName = found.cityName;

  const canonical = localizedUrl(
    locale as Locale,
    `/services/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`,
  );
  const title = locale === "ar"
    ? `${name} في ${cityName} | حجز مباشر`
    : `${name} in ${cityName} | Book now`;
  const kind = found.item.specialty || found.item.serviceType || found.item.facilityType;
  const desc = locale === "ar"
    ? `${name}${kind ? ` — ${kind}` : ""} في ${cityName}. احجز عبر منصة نبض بلس.`
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

  // An unreadable catalog throws (error page), a missing pair is a 404.
  const found = await findNamedService(API_BASE, serviceSlug, citySlug, locale, cachedFetch);
  if (!found) {
    notFound();
  }

  const svc = found.item;
  const name = String(svc.name);
  const cityName = found.cityName;
  const kind = svc.specialty || svc.serviceType || svc.facilityType;
  const pageTitle = found.title;

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
            ? `${kind ? `${kind} — ` : ""}احجز ${name} في ${cityName} عبر منصة نبض بلس.`
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
