import { patientApiUrl } from "@/lib/api/upstream";
import { parseHomeCareServiceId } from "./home-care-services";

function servicePath(path: string) {
  if (path === "/home-care/services") return path;
  const match = path.match(/^\/home-care\/services\/([^/]+)$/);
  if (!match || !parseHomeCareServiceId(match[1]).success) throw new Error("invalid_home_care_service_path");
  return path;
}

/** Public Home-care catalog contract. No patient credential is sent. */
export async function getPublicHomeCareServices(): Promise<Response | null> {
  try { return await fetch(patientApiUrl(servicePath("/home-care/services")), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
}

export async function getPublicHomeCareService(serviceId: string): Promise<Response | null> {
  if (!parseHomeCareServiceId(serviceId).success) throw new Error("invalid_home_care_service_id");
  try { return await fetch(patientApiUrl(servicePath(`/home-care/services/${serviceId}`)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
}
