import { patientApiUrl } from "@/lib/api/upstream";

const allowedSortFlags = new Set(["highest_rated", "nearest", "lowest_price"]);
function validQuery(value: string | undefined) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 120 ? trimmed : undefined;
}

export async function getPublicLabServices(params: {
  category?: string; search?: string; homeOnly?: boolean; highestRated?: boolean; nearest?: boolean; lowestPrice?: boolean;
} = {}): Promise<Response | null> {
  const query = new URLSearchParams();
  const category = validQuery(params.category); const search = validQuery(params.search);
  if (category) query.set("category", category);
  if (search) query.set("search", search);
  if (params.homeOnly) query.set("home_visit", "true");
  for (const [key, enabled] of [["highest_rated", params.highestRated], ["nearest", params.nearest], ["lowest_price", params.lowestPrice]] as const) {
    if (enabled && allowedSortFlags.has(key)) query.set(key, "true");
  }
  const path = `/labs/services${query.toString() ? `?${query.toString()}` : ""}`;
  try { return await fetch(patientApiUrl(path), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
}
