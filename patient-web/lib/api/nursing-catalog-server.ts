import { patientUpstreamFetch } from "@/lib/api/upstream";

export function getPublicNursingCatalog() {
  return patientUpstreamFetch("/nursing/catalog", { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" }).catch(() => null);
}
