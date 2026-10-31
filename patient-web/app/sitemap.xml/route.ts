import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { siteOrigin } from "@/lib/seo";
import { getProductSitemap } from "@/lib/api/public-products-server";
import { patientApiUrl } from "@/lib/api/upstream";
import { getDisabledModules } from "@/lib/api/public-config-server";
import { MODULE_SITEMAPS } from "@/lib/modules";
import { publicReadSignal } from "@/lib/api/public-timeout";
import { sitemapPageCount } from "@/lib/sitemap";
import { labSitemapEntries, nursingSitemapEntries } from "@/lib/sitemap-catalogue";

// Computed per request: a build-time prerender (backend unreachable during the image build) froze an
// index with no product sitemaps. The backend count itself is cached for an hour (fetch revalidate).
export const dynamic = "force-dynamic";

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
    `${siteOrigin()}/sitemaps/radiology.xml`,
    `${siteOrigin()}/sitemaps/articles.xml`,
  ];
  // a switched-off module drops its entity sitemaps (#953)
  const disabled = await getDisabledModules();
  const hidden = new Set([...disabled].flatMap((key) => MODULE_SITEMAPS[key] ?? []));
  const kept = entries.filter((url) => !hidden.has(url.slice(url.lastIndexOf("/") + 1)));
  entries.length = 0;
  entries.push(...kept);
  // labs and nursing are paged per locale (/sitemaps/<kind>/<locale>/<n>.xml, <= 45,000 URLs each); a module switched off drops its pages.
  // A feed that fails leaves that kind out of this index only: the other sitemaps and the pages crawlers already know stay.
  const paged: Array<[string, string, () => Promise<unknown[]>]> = [
    ["labs", "labs.xml", labSitemapEntries],
    ["nursing", "nursing.xml", nursingSitemapEntries],
  ];
  for (const [kind, file, build] of paged) {
    if (hidden.has(file)) continue;
    let count = 0;
    try { count = (await build()).length; } catch { count = 0; }
    if (!count) continue;
    for (const locale of locales) for (let p = 1; p <= sitemapPageCount(count); p++) entries.push(`${siteOrigin()}/sitemaps/${kind}/${locale}/${p}.xml`);
  }
  for (const locale of locales) {
    // Light count endpoint (bytes, not megabytes): total → pages.
    let pages = 0;
    try {
      const res = await fetch(patientApiUrl(`/public/sitemaps/products-count`), { signal: publicReadSignal(),
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
