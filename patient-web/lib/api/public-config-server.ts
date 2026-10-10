import { cache } from "react";
import { patientApiUrl } from "@/lib/api/upstream";
import { parseDisabled, type DisabledModules, NONE_DISABLED } from "@/lib/modules";

export type HomeSectionItem = { id?: string; title_ar?: string; title_en?: string; image_url?: string; deep_link?: string };
export type HomeSection = { id?: string; title_ar?: string; title_en?: string; enabled?: boolean; position?: number; items?: HomeSectionItem[] };

/**
 * R6-5: web honours the admin maintenance flag for the web app. The admin writes the message in Arabic and English only:
 * the page shows the one in its own language, and every other language the translated default (no message here), never the
 * other language's text.
 */
export function isWebMaintenance(config: any, locale: string = "en"): { maintenance: boolean; message?: string } {
  const entry = config?.app_versions?.apps?.web || {};
  if (entry.maintenance !== true) return { maintenance: false };
  const field = locale === "ar" ? entry.message_ar : locale === "en" ? entry.message_en : undefined;
  return { maintenance: true, message: typeof field === "string" && field.trim() ? field : undefined };
}

/** R6-5: enabled home sections in position order (same rule as the apps). */
export function selectHomeSections(payload: any): HomeSection[] {
  const list = Array.isArray(payload?.sections) ? payload.sections : [];
  return list
    .filter((s: any) => s?.enabled !== false && Array.isArray(s?.items) && s.items.length > 0)
    .sort((a: any, b: any) => (a?.position || 0) - (b?.position || 0));
}

/** What a public read answered: the body (null when there is none) and whether the service FAILED (network error or 5xx), as opposed to answering with nothing. */
export type PublicRead = { data: any | null; failed: boolean };

/**
 * F82-1: these reads are public (no credential, no cookie, the same answer for everyone), so the Next data
 * cache keeps a successful answer for a minute instead of every render paying an API round trip (that round
 * trip was the TTFB of the home page). The cache lives in the app server and is keyed by URL; nothing
 * user-specific is ever stored in it. An admin change shows within a minute. A failed read (5xx or a network
 * error) is reported as `failed` and is never stored. Next serves the last good copy while it revalidates and
 * keeps it when the revalidation fails, so during an outage a page that has a cached copy keeps showing it
 * (stale-while-revalidate); the ErrorState shows when there is no cached copy (first request, or a cleared
 * cache). Measured in the F82-1 PR.
 */
const PUBLIC_REVALIDATE_SECONDS = 60;

async function readPublic(path: string, revalidate: number = PUBLIC_REVALIDATE_SECONDS): Promise<PublicRead> {
  try {
    const res = await fetch(patientApiUrl(path), { headers: { Accept: "application/json" }, next: { revalidate } });
    if (res.status >= 500) return { data: null, failed: true };
    if (!res.ok) return { data: null, failed: false };
    return { data: await res.json().catch(() => null), failed: false };
  } catch {
    return { data: null, failed: true };
  }
}

/** Public config only: no credential is ever sent. */
export const readPublicConfig = () => readPublic("/config");
/** Public home curation only: no credential is ever sent. */
export const readHomeContent = () => readPublic("/content/home");
export async function getPublicConfig(): Promise<any | null> { return (await readPublicConfig()).data; }
export async function getHomeContent(): Promise<any | null> { return (await readHomeContent()).data; }

/** Module switches (#953): GET /modules is public and cached 15 s, so a switch shows on the site within seconds. */
const MODULES_REVALIDATE_SECONDS = 15;
export const readModules = () => readPublic("/modules", MODULES_REVALIDATE_SECONDS);

/** The switched-off modules for this render. FAIL-OPEN: when the call fails or answers oddly, nothing is hidden. One read per request. */
export const getDisabledModules = cache(async (): Promise<DisabledModules> => {
  const read = await readModules();
  return read.failed ? NONE_DISABLED : parseDisabled(read.data);
});
