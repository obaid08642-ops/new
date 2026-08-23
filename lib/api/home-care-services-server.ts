import { callPatientApi, patientApiUrl } from "@/lib/api/upstream";
import { parseHomeCareServiceId } from "./home-care-services";

function servicePath(path: string) {
  if (path === "/home-care/services") return path;
  const match = path.match(/^\/home-care\/services\/([^/]+)$/);
  if (!match || !parseHomeCareServiceId(match[1]).success) throw new Error("invalid_home_care_service_path");
  return path;
}

/** Protected Home-care catalog contract. A patient session is required by the live API. */
export function getPatientHomeCareServices(accessToken: string) {
  return callPatientApi(servicePath("/home-care/services"), { method: "GET", cache: "no-store" }, accessToken);
}

export function getPatientHomeCareService(serviceId: string, accessToken: string) {
  if (!parseHomeCareServiceId(serviceId).success) throw new Error("invalid_home_care_service_id");
  return callPatientApi(servicePath(`/home-care/services/${serviceId}`), { method: "GET", cache: "no-store" }, accessToken);
}

/** @deprecated The live contract is protected; use getPatientHomeCareServices. */
export async function getPublicHomeCareServices(): Promise<Response | null> {
  try { return await fetch(patientApiUrl(servicePath("/home-care/services")), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
}

/** @deprecated The live contract is protected; use getPatientHomeCareService. */
export async function getPublicHomeCareService(serviceId: string): Promise<Response | null> {
  if (!parseHomeCareServiceId(serviceId).success) throw new Error("invalid_home_care_service_id");
  try { return await fetch(patientApiUrl(servicePath(`/home-care/services/${serviceId}`)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
}
