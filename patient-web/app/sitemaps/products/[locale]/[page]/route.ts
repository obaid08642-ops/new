import { NextResponse } from "next/server";
import { getProductSitemap } from "@/lib/api/public-products-server";
import { isLocale } from "@/lib/i18n";
import { localizedUrl, SITEMAP_NS, hreflangLinks } from "@/lib/seo";

export const revalidate = 21600;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Props = { params: Promise<{ locale: string; page: string }> };

/** Paginated product sitemap (same-host URLs for /{lang}/p/{slug}). */
export async function GET(_req: Request, { params }: Props) {
  const { locale, page } = await params;
  const pageNum = Number((page || "").replace(/\.xml$/, ""));
  if (!isLocale(locale) || !Number.isInteger(pageNum) || pageNum < 1) {
    return new NextResponse("not_found", { status: 404 });
  }
  const data = await getProductSitemap(locale, pageNum);
  if (!data) return new NextResponse("upstream_unavailable", { status: 503 });
  const urls = data.urls.map((u) => {
    const path = `/p/${encodeURIComponent(u.slug)}`;
    const loc = localizedUrl(locale, path);
    return `  <url><loc>${esc(loc)}</loc>${hreflangLinks(path)}${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.8</priority></url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${SITEMAP_NS}>\n${urls.join("\n")}\n</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
