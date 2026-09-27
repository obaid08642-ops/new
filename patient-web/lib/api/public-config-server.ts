import { patientApiUrl } from "@/lib/api/upstream";

export type HomeSectionItem = { id?: string; title_ar?: string; title_en?: string; image_url?: string; deep_link?: string };
export type HomeSection = { id?: string; title_ar?: string; title_en?: string; enabled?: boolean; position?: number; items?: HomeSectionItem[] };

/** R6-5: web honours the admin maintenance flag for the web app. */
export function isWebMaintenance(config: any): { maintenance: boolean; message?: string } {
  const entry = config?.app_versions?.apps?.web || {};
  if (entry.maintenance !== true) return { maintenance: false };
  const message =
    (typeof entry.message_en === "string" && entry.message_en) ||
    (typeof entry.message_ar === "string" && entry.message_ar) ||
    undefined;
  return { maintenance: true, message };
}

/** R6-5: enabled home sections in position order (same rule as the apps). */
export function selectHomeSections(payload: any): HomeSection[] {
  const list = Array.isArray(payload?.sections) ? payload.sections : [];
  return list
    .filter((s: any) => s?.enabled !== false && Array.isArray(s?.items) && s.items.length > 0)
    .sort((a: any, b: any) => (a?.position || 0) - (b?.position || 0));
}

/** Public config only: no credential is ever sent. */
export async function getPublicConfig(): Promise<any | null> {
  try {
    const res = await fetch(patientApiUrl("/config"), { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

/** Public home curation only: no credential is ever sent. */
export async function getHomeContent(): Promise<any | null> {
  try {
    const res = await fetch(patientApiUrl("/content/home"), { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}
