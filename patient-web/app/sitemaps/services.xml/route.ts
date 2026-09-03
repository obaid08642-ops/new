import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

export const revalidate = 21600;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";
  let items: Array<{ service_id: string; lastmod?: string }> = [];
  try {
    const res = await fetch(`${backendUrl}/api/v1/public/ai-catalog/services`, {
      next: { revalidate: 21600 },
      headers: { "User-Agent": "NabdPlus-Sitemap-Renderer/1.0" },
    });
    if (res.ok) {
      const data = await res.json();
      items = data?.items || [];
    }
  } catch {
    items = [];
  }

  const cities = ["riyadh", "jeddah", "dammam", "makkah", "madinah", "khobar"];

  const urls = locales.flatMap((locale) =>
    items.flatMap((item) =>
      cities.map((city) => {
        const loc = localizedUrl(locale, `/services/${encodeURIComponent(item.service_id)}/${city}`);
        return `  <url><loc>${esc(loc)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
      }),
    ),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
