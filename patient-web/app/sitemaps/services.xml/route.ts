import { NextResponse } from "next/server";
import { locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { cityServices, listCities } from "@/lib/seo/service-city";

export const revalidate = 21600;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** fetch with a timeout; the shared resolver treats a failure as "unavailable". */
function timedFetch(timeoutMs: number) {
  return async (url: string): Promise<Response> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, {
        next: { revalidate: 21600 },
        headers: { "User-Agent": "NabdPlus-Sitemap-Renderer/1.0" },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };
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

  const fetcher = timedFetch(10000);
  // Same resolver as the page and the proxy 404 (lib/seo/service-city.ts), so
  // every emitted URL is a pair the page renders: a slugged, named service
  // listed in that city's own catalog feed.
  const cities = (await listCities(backendUrl, fetcher).catch(() => [])).slice(0, 150);

  const pairs: Array<{ sid: string; city: string }> = [];
  const CONCURRENCY = 10;
  for (let i = 0; i < cities.length; i += CONCURRENCY) {
    const batch = cities.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (city) => {
        // A city whose feed cannot be read contributes zero URLs (never a guess).
        const items = await cityServices(backendUrl, city, "ar", fetcher).catch(() => []);
        const sids = new Set(items.map((item) => String(item.slug).trim()));
        return { latin: city.latin, sids: [...sids] };
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
