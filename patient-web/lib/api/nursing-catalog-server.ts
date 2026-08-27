import { patientApiUrl } from "@/lib/api/upstream";

export function getPublicNursingCatalog() {
  return fetch(patientApiUrl("/nursing/catalog"), { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" }).catch(() => null);
}
