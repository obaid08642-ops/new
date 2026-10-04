import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

export const revalidate = 21600;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type GeoCity = { code?: string; name_ar?: string; name_en?: string };

async function fetchJson(url: string, timeoutMs: number): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      next: { revalidate: 21600 },
      headers: { "User-Agent": "NabdPlus-Sitemap-Renderer/1.0" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Q33: the old generator crossed EVERY service id with EVERY city code
 * (26 x 150 x locales) without checking availability, so ~13,500 sitemap
 * URLs rendered a generic all-services list (or a 404). This generator
 * emits only verified pairs: for each city it reads that city's own
 * catalog feed and emits one URL per provider actually listed there.
 * A city whose feed cannot be read contributes zero URLs (never a guess).
 */
export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

  const geoData = await fetchJson(`${backendUrl}/api/v1/locations/cities`, 10000);
  const geoList: GeoCity[] = Array.isArray(geoData) ? geoData : geoData?.data || [];
  // latin slug -> Arabic city name (the catalog filters on stored Arabic names).
  const cities = geoList
    .map((c) => ({
      latin: String(c.code || "").replace(/^sa-/, "").toLowerCase(),
      arabic: String(c.name_ar || ""),
    }))
    .filter((c) => c.latin && c.arabic && !c.latin.includes("-"))
    .slice(0, 150);

  const pairs: Array<{ sid: string; city: string }> = [];
  const CONCURRENCY = 10;
  for (let i = 0; i < cities.length; i += CONCURRENCY) {
    const batch = cities.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async ({ latin, arabic }) => {
        const feed = await fetchJson(
          `${backendUrl}/api/v1/public/ai-catalog/services?city=${encodeURIComponent(arabic)}`,
          10000,
        );
        const items: any[] = feed?.items || [];
        const sids = new Set<string>();
        for (const item of items) {
          // Feed rows carry `id` (+ optional slug/service_id); the page
          // resolves the same identifiers, so emit only what it can render.
          const sid = item?.id || item?.slug || item?.service_id;
          if (sid) sids.add(String(sid));
        }
        return { latin, sids: [...sids] };
      }),
    );
    for (const { latin, sids } of results) {
      for (const sid of sids) pairs.push({ sid, city: latin });
    }
  }

  const urls = locales.flatMap((locale) =>
    pairs.map(({ sid, city }) => {
      const loc = localizedUrl(locale, `/services/${encodeURIComponent(sid)}/${city}`);
      return `  <url><loc>${esc(loc)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
