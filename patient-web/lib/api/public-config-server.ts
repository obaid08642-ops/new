import { patientApiUrl } from "@/lib/api/upstream";

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

async function readPublic(path: string): Promise<PublicRead> {
  try {
    const res = await fetch(patientApiUrl(path), { headers: { Accept: "application/json" }, cache: "no-store" });
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
