import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { siteOrigin } from "@/lib/seo";
import { getProductSitemap } from "@/lib/api/public-products-server";

export const revalidate = 3600;

/** Sitemap index: static pages + paginated product sitemaps per locale. */
export async function GET() {
  const entries: string[] = [`${siteOrigin()}/sitemaps/static.xml`];
  for (const locale of locales) {
    const first = await getProductSitemap(locale, 1);
    const pages = first?.pages || 0;
    for (let p = 1; p <= pages; p++) {
      entries.push(`${siteOrigin()}/sitemaps/products/${locale}/${p}.xml`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((loc) => `  <sitemap><loc>${loc}</loc></sitemap>`)
    .join("\n")}\n</sitemapindex>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
