import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

export const revalidate = 21600;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";
  let doctors: Array<{ slug: string; lastmod?: string }> = [];
  try {
    const res = await fetch(`${backendUrl}/api/v1/public/sitemaps/doctors/ar`, {
      next: { revalidate: 21600 },
      headers: { "User-Agent": "NabdPlus-Sitemap-Renderer/1.0" },
    });
    if (res.ok) {
      const data = await res.json();
      doctors = data?.urls || [];
    }
  } catch {
    doctors = [];
  }

  // GEO: each doctor also indexed with city variants for "best dermatologist in Riyadh" queries
  const cities = ["riyadh", "jeddah", "dammam", "makkah", "madinah", "khobar"];
  const urls = locales.flatMap((locale) =>
    doctors.flatMap((d) => {
      const base = `  <url><loc>${esc(localizedUrl(locale, `/doctor/${encodeURIComponent(d.slug)}`))}</loc>${d.lastmod ? `<lastmod>${d.lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.85</priority></url>`;
      const geo = cities.map((city) => `  <url><loc>${esc(localizedUrl(locale, `/doctor/${encodeURIComponent(d.slug)}/${city}`))}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
      return [base, ...geo];
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
