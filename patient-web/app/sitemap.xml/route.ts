import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { siteOrigin } from "@/lib/seo";
import { getProductSitemap } from "@/lib/api/public-products-server";
import { patientApiUrl } from "@/lib/api/upstream";

export const revalidate = 3600;

/** Sitemap index: static pages + paginated product sitemaps per locale. */
export async function GET() {
  const entries: string[] = [
    `${siteOrigin()}/sitemaps/static.xml`,
    `${siteOrigin()}/sitemaps/doctors.xml`,
    `${siteOrigin()}/sitemaps/facilities.xml`,
    `${siteOrigin()}/sitemaps/conditions.xml`,
    `${siteOrigin()}/sitemaps/locations.xml`,
    `${siteOrigin()}/sitemaps/services.xml`,
    `${siteOrigin()}/sitemaps/pharmacies.xml`,
    `${siteOrigin()}/sitemaps/labs.xml`,
    `${siteOrigin()}/sitemaps/radiology.xml`,
  ];
  for (const locale of locales) {
    // Light count endpoint (bytes, not megabytes): total → pages.
    let pages = 0;
    try {
      const res = await fetch(patientApiUrl(`/public/sitemaps/products-count`), {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      } as RequestInit);
      if (res.ok) pages = (await res.json().catch(() => null))?.pages || 0;
    } catch { pages = 0; }
    // Fallback: full page-1 (also repairs a count outage).
    if (!pages) {
      const first = await getProductSitemap(locale, 1);
      pages = first?.pages || 0;
    }
    for (let p = 1; p <= pages; p++) {
      entries.push(`${siteOrigin()}/sitemaps/products/${locale}/${p}.xml`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((loc) => `  <sitemap><loc>${loc}</loc></sitemap>`)
    .join("\n")}\n</sitemapindex>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
