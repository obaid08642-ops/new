import { patientApiUrl } from "@/lib/api/upstream";
import { publicReadSignal } from "@/lib/api/public-timeout";

export function getPublicNursingCatalog() {
  return fetch(patientApiUrl("/nursing/catalog"), { signal: publicReadSignal(), method: "GET", headers: { Accept: "application/json" }, cache: "no-store" }).catch(() => null);
}
