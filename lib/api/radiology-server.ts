import { callPatientApi } from "@/lib/api/upstream";

const modalities = new Set(["ct", "dexa", "mammography", "mri", "ultrasound", "xray"]);
const bool = (v?: string) => v === "true" ? "true" : v === "false" ? "false" : undefined;
export type RadiologyQuery = { modality?: string; bodyPart?: string; homeVisit?: string; homeOnly?: string; highestRated?: string; nearest?: string; lowestPrice?: string; search?: string };
export function getPublicRadiologyModalities() { return callPatientApi("/radiology/modalities", { method: "GET", cache: "no-store" }); }

export function getPublicRadiologyServiceDetail(identifier: string) {
  const safe = identifier.trim().slice(0, 128);
  return callPatientApi(`/radiology/services/${encodeURIComponent(safe)}`, { method: "GET", cache: "no-store" });
}

export function getPublicRadiologyServices(query: RadiologyQuery = {}) {
  const params = new URLSearchParams();
  if (query.modality && modalities.has(query.modality)) params.set("modality", query.modality);
  if (query.bodyPart?.trim()) params.set("body_part", query.bodyPart.trim().slice(0, 100));
  for (const [key, value] of [["home_visit", bool(query.homeVisit)], ["home_only", bool(query.homeOnly)], ["highest_rated", bool(query.highestRated)], ["nearest", bool(query.nearest)], ["lowest_price", bool(query.lowestPrice)]] as const) if (value) params.set(key, value);
  if (query.search?.trim()) params.set("search", query.search.trim().slice(0, 120));
  return callPatientApi(`/radiology/services${params.toString() ? `?${params}` : ""}`, { method: "GET", cache: "no-store" });
}
