import { readPublicEntity } from "@/lib/api/public-read";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

export type CatalogItem = { id?: string; _id?: string; slug?: string; short_code?: string; name_ar?: string; name_en?: string; description_ar?: string; description_en?: string };

const rows = (data: unknown): CatalogItem[] => {
  if (Array.isArray(data)) return data as CatalogItem[];
  const d = data as { items?: CatalogItem[]; data?: CatalogItem[] } | null;
  return d?.items ?? d?.data ?? [];
};

/** The URL token a city page uses for a catalogue item (the same rule as the sitemaps). */
export const labToken = (x: CatalogItem) => String(x.slug || x.short_code || x.id || x._id || "");
export const radiologyToken = (x: CatalogItem) => labToken(x).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * The reviewed catalogue item a lab or radiology city page names, or null: a city page exists only
 * for a real test or service (no page for a made-up slug).
 */
export async function findCatalogItem(kind: "lab" | "radiology", token: string): Promise<CatalogItem | null> {
  const path = kind === "lab" ? "/labs/services?limit=100" : "/radiology/services?limit=100";
  const data = await readPublicEntity<unknown>(`${API_BASE}/api/v1${path}`, 3600);
  const want = decodeURIComponent(token).toLowerCase();
  const key = kind === "lab" ? labToken : radiologyToken;
  return rows(data).find((x) => key(x).toLowerCase() === want) ?? null;
}
