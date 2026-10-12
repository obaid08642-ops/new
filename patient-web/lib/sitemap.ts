import { NextResponse } from "next/server";
import { locales, type Locale } from "@/lib/i18n";
import { SITEMAP_NS, escXml, hreflangLinks, localizedUrl } from "@/lib/seo";

/** Sitemap protocol limit per file. */
export const MAX_SITEMAP_URLS = 50_000;

export function backendOrigin() {
  return (process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus").replace(/\/$/, "");
}

/**
 * GET a backend JSON feed for a sitemap. Throws when the backend fails: the route then errors
 * and Next keeps serving the last good copy (stale-if-error), instead of publishing an empty
 * sitemap that would tell crawlers every page is gone.
 */
export async function sitemapFeed<T>(path: string, revalidate = 21600): Promise<T> {
  const res = await fetch(`${backendOrigin()}/api/v1${path}`, {
    next: { revalidate },
    headers: { "User-Agent": "NabdPlus-Sitemap-Renderer/1.0", Accept: "application/json" },
  } as RequestInit);
  if (!res.ok) throw new Error(`sitemap_feed_${res.status}:${path}`);
  return (await res.json()) as T;
}

/** Items of a list response ({items}|{data}|{urls}|array). */
export function listItems<T = Record<string, unknown>>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const d = data as { items?: T[]; data?: T[]; urls?: T[] } | null;
  return d?.urls ?? d?.items ?? d?.data ?? [];
}

/** The public city slugs (same source the city pages read). */
export async function citySlugs(): Promise<string[]> {
  const data = await sitemapFeed<unknown>("/locations/cities");
  return [...new Set(listItems<{ code?: string }>(data).map((c) => String(c.code || "").replace(/^sa-/, "").toLowerCase()).filter(Boolean))].slice(0, 150);
}

type Entry = { path: string; lastmod?: string; changefreq?: string; priority?: string };

/** One <url> per locale for a locale-less path, each carrying the six hreflang links and x-default. */
export function localizedEntries(e: Entry): string[] {
  const extra = `${e.lastmod ? `<lastmod>${escXml(e.lastmod)}</lastmod>` : ""}<changefreq>${e.changefreq ?? "weekly"}</changefreq><priority>${e.priority ?? "0.7"}</priority>`;
  const alternates = hreflangLinks(e.path);
  return locales.map((l: Locale) => `  <url><loc>${escXml(localizedUrl(l, e.path))}</loc>${alternates}${extra}</url>`);
}

export function urlsetResponse(entries: string[]) {
  const body = entries.slice(0, MAX_SITEMAP_URLS).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${SITEMAP_NS}>\n${body}\n</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

/** A whole sitemap of locale-less paths, capped to the protocol limit (six URLs per path). */
export function localizedSitemap(entries: Entry[]) {
  return urlsetResponse(entries.slice(0, Math.floor(MAX_SITEMAP_URLS / locales.length)).flatMap(localizedEntries));
}
