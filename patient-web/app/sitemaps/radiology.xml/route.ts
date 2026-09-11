import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

export const revalidate = 21600;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const FALLBACK_PROCS = [
  "mri-magnetic-resonance-imaging",
  "ct-computed-tomography-scan",
  "ultrasound-sonography",
  "x-ray-radiography",
  "mammogram-breast-imaging",
  "dexa-bone-density-scan",
];
const FALLBACK_CITIES = ["riyadh", "jeddah", "dammam", "makkah", "madinah", "khobar"];

/** DB-driven radiology sitemap: live services × live cities. No hardcoded catalog. */
export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";
  let procs: string[] = [];
  let cities: string[] = [];
  try {
    const res = await fetch(`${backendUrl}/api/v1/radiology/services?limit=100`, {
      next: { revalidate: 21600 },
      headers: { "User-Agent": "NabdPlus-Sitemap-Renderer/1.0" },
    });
    if (res.ok) {
      const data: any = await res.json();
      const items: any[] = Array.isArray(data) ? data : data?.data || data?.items || [];
      procs = items
        .map((x: any) => String(x.slug || x.short_code || x.id || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
        .filter(Boolean)
        .slice(0, 100);
    }
  } catch {
    procs = [];
  }
  try {
    const geoRes = await fetch(`${backendUrl}/api/v1/locations/cities`, {
      next: { revalidate: 21600 },
      headers: { "User-Agent": "NabdPlus-Sitemap-Renderer/1.0" },
    });
    if (geoRes.ok) {
      const geoData: any = await geoRes.json();
      const geoList: any[] = Array.isArray(geoData) ? geoData : geoData?.data || [];
      cities = geoList
        .map((c: any) => String(c.code || "").replace(/^sa-/, "").toLowerCase())
        .filter(Boolean)
        .slice(0, 150);
    }
  } catch {
    cities = [];
  }
  if (!procs.length) procs = FALLBACK_PROCS;
  if (!cities.length) cities = FALLBACK_CITIES;

  const urls = locales.flatMap((locale) =>
    procs.flatMap((proc) =>
      cities.map((city) => {
        const loc = localizedUrl(locale, `/radiology/${encodeURIComponent(proc)}/${city}`);
        return `  <url><loc>${esc(loc)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
      }),
    ),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
