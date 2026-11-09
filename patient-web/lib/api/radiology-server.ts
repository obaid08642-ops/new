import { callPatientApi } from "@/lib/api/upstream";
import { publicListRead } from "@/lib/api/last-good";

// the scan types come from GET /radiology/modalities (whatever the catalogue holds, any case); only a plain token is sent on
const modalityToken = /^[A-Za-z0-9_-]{1,40}$/;
const bool = (v?: string) => v === "true" ? "true" : v === "false" ? "false" : undefined;
export type RadiologyQuery = { page?: number; limit?: number; category?: string; modality?: string; bodyPart?: string; homeVisit?: string; homeOnly?: string; highestRated?: string; nearest?: string; lowestPrice?: string; search?: string };
export function getPublicRadiologyModalities() { return publicListRead("radiology:modalities", () => callPatientApi("/radiology/modalities", { method: "GET", cache: "no-store" }), { retry: false }); }

export function getPublicRadiologyServiceDetail(identifier: string) {
  const safe = identifier.trim().slice(0, 128);
  return callPatientApi(`/radiology/services/${encodeURIComponent(safe)}`, { method: "GET", cache: "no-store" });
}

export function getPublicRadiologyServices(query: RadiologyQuery = {}) {
  const params = new URLSearchParams();
  if (query.page !== undefined && Number.isInteger(query.page) && query.page >= 1) {
    params.set("page", String(query.page));
    params.set("limit", String(query.limit !== undefined && Number.isInteger(query.limit) && query.limit >= 1 ? Math.min(query.limit, 100) : 20));
  }
  // a scan's category is its modality; `modality` wins when both are sent
  if (query.category && modalityToken.test(query.category)) params.set("category", query.category);
  if (query.modality && modalityToken.test(query.modality)) params.set("modality", query.modality);
  if (query.bodyPart?.trim()) params.set("body_part", query.bodyPart.trim().slice(0, 100));
  for (const [key, value] of [["home_visit", bool(query.homeVisit)], ["home_only", bool(query.homeOnly)], ["highest_rated", bool(query.highestRated)], ["nearest", bool(query.nearest)], ["lowest_price", bool(query.lowestPrice)]] as const) if (value) params.set(key, value);
  if (query.search?.trim()) params.set("search", query.search.trim().slice(0, 120));
  const path = `/radiology/services${params.toString() ? `?${params}` : ""}`;
  // callPatientApi already retries a read; the copy covers the outage that outlasts the retries
  return publicListRead(`radiology:${path}`, () => callPatientApi(path, { method: "GET", cache: "no-store" }), { retry: false });
}
