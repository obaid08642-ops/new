import { patientApiUrl } from "@/lib/api/upstream";
import { publicReadSignal } from "@/lib/api/public-timeout";
import { publicListRead } from "@/lib/api/last-good";

export function getPublicNursingCatalog() {
  return publicListRead("nursing:catalog", () => fetch(patientApiUrl("/nursing/catalog"), { signal: publicReadSignal(), method: "GET", headers: { Accept: "application/json" }, cache: "no-store" }));
}

/** The nursing services with what nurses offer for each (providers_count, from_price, where, insurance): GET /home-care/services, public. */
export function getPublicNursingServices() {
  return publicListRead("nursing:services", () => fetch(patientApiUrl("/home-care/services"), { signal: publicReadSignal(), method: "GET", headers: { Accept: "application/json" }, cache: "no-store" }));
}

/** One nursing service with its offers: GET /home-care/services/:id, public. */
export function getPublicNursingService(id: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return Promise.resolve(null);
  return fetch(patientApiUrl(`/home-care/services/${encodeURIComponent(id)}`), { signal: publicReadSignal(), method: "GET", headers: { Accept: "application/json" }, cache: "no-store" }).catch(() => null);
}
