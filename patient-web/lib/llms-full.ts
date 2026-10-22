import { backendOrigin, listItems } from "@/lib/sitemap";
import { publicReadSignal } from "@/lib/api/public-timeout";

export const LLMS_LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;
export type LlmsLocale = (typeof LLMS_LOCALES)[number];

export function siteOriginForLlms() {
  return (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");
}

/** GET a backend list; throws on failure so the route keeps its last good copy. */
export async function backendList<T>(path: string, revalidate = 21600): Promise<T[]> {
  const res = await fetch(`${backendOrigin()}/api/v1${path}`, { signal: publicReadSignal(), next: { revalidate }, headers: { Accept: "application/json" } } as RequestInit);
  if (!res.ok) throw new Error(`llms_feed_${res.status}:${path}`);
  return listItems<T>(await res.json());
}

/** "[label](ar url) · [en](…) · … · [fil](…)" for a locale-less path. */
export function sixLocaleLinks(label: string, path: string) {
  const o = siteOriginForLlms();
  const clean = label.replace(/[[\]\n|]/g, " ").trim() || path;
  return `- [${clean}](${o}/ar${path}) · ${LLMS_LOCALES.slice(1).map((l) => `[${l}](${o}/${l}${path})`).join(" · ")}`;
}

export const cell = (v: unknown) => String(v ?? "").replace(/[|\n\r]+/g, " ").trim();
