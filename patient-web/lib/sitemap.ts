import { NextResponse } from "next/server";
import { locales, type Locale } from "@/lib/i18n";
import { SITEMAP_NS, escXml, hreflangLinks, localizedUrl } from "@/lib/seo";
import { publicReadSignal } from "@/lib/api/public-timeout";

/** Sitemap protocol limit per file. */
export const MAX_SITEMAP_URLS = 50_000;
/** The protocol allows 50,000 URLs and 50 MB (uncompressed) per file; a test fails above these margins. */
export const SITEMAP_LIMIT_URLS = 45_000;
export const SITEMAP_MAX_BYTES = 45 * 1024 * 1024;
/**
 * What one paged file holds. A URL with its six hreflang links and x-default is about 0.8-1.1 KB, so 45,000 of them would pass the byte limit
 * long before the count one (about 48 MB): 25,000 keeps a file near 28 MB even with longer slugs.
 */
export const SITEMAP_PAGE_URLS = 25_000;

export function backendOrigin() {
  return (process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus").replace(/\/$/, "");
}

/**
 * GET a backend JSON feed for a sitemap. Throws when the backend fails (see `sitemapRoute`): an
 * empty sitemap is never published, it would tell crawlers every page is gone. The feed itself is
 * kept in the Next data cache for `revalidate` seconds.
 */
export async function sitemapFeed<T>(path: string, revalidate = 21600): Promise<T> {
  const res = await fetch(`${backendOrigin()}/api/v1${path}`, { signal: publicReadSignal(),
    // issue 1541: the backend purges "sitemap" when a provider is deleted, so its entry leaves the sitemap at once
    next: { revalidate, tags: ["sitemap"] },
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

/** The URL entries of one locale for locale-less paths: the page's own URL with the six hreflang links and x-default. */
export function localeEntries(locale: Locale, entries: Entry[]): string[] {
  return entries.map((e) => {
    const extra = `${e.lastmod ? `<lastmod>${escXml(e.lastmod)}</lastmod>` : ""}<changefreq>${e.changefreq ?? "weekly"}</changefreq><priority>${e.priority ?? "0.7"}</priority>`;
    return `  <url><loc>${escXml(localizedUrl(locale, e.path))}</loc>${hreflangLinks(e.path)}${extra}</url>`;
  });
}

export const sitemapPageCount = (entries: number, pageSize = SITEMAP_PAGE_URLS) => Math.max(1, Math.ceil(entries / pageSize));

/**
 * One page of a paged sitemap: /sitemaps/<kind>/<locale>/<n>.xml. Each file holds one locale (so a catalogue of N paths needs N URLs per file,
 * not 6N) and at most SITEMAP_PAGE_URLS (25,000) of them; the index lists as many pages as the entries need. A page past the end is a 404.
 */
export function pagedSitemapResponse(locale: Locale, entries: Entry[], page: number, pageSize = SITEMAP_PAGE_URLS) {
  if (!Number.isInteger(page) || page < 1 || page > sitemapPageCount(entries.length, pageSize)) return new NextResponse("not_found", { status: 404 });
  const slice = entries.slice((page - 1) * pageSize, page * pageSize);
  return urlsetResponse(localeEntries(locale, slice));
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

/**
 * Runs a sitemap builder. When a feed fails it answers 503 + Retry-After, so crawlers come back
 * later and keep the URLs they know (never an empty or invented list). The routes are dynamic: a
 * build without the backend must not fail or freeze an empty file.
 */
export async function sitemapRoute(build: () => Promise<Response>): Promise<Response> {
  try {
    return await build();
  } catch {
    return new NextResponse("sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "600", "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
}
