import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

export const revalidate = 86400;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";
  let locations: Array<{ slug: string; lastmod?: string }> = [];
  try {
    const res = await fetch(`${backendUrl}/api/v1/public/sitemaps/locations/ar`, {
      next: { revalidate: 86400 },
      headers: { "User-Agent": "NabdPlus-Sitemap-Renderer/1.0" },
    });
    if (res.ok) {
      const data = await res.json();
      locations = data?.urls || [];
    }
  } catch {
    locations = [];
  }

  const urls = locales.flatMap((locale) =>
    locations.map((l) => {
      const loc = localizedUrl(locale, `/doctors/${l.slug}`);
      return `  <url><loc>${esc(loc)}</loc>${l.lastmod ? `<lastmod>${l.lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.7</priority></url>`;
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
