import { callPatientApi } from "@/lib/api/upstream";

export function getPatientNursingVisits(accessToken: string) {
  return callPatientApi("/nursing/visits", { method: "GET", cache: "no-store", headers: { accept: "application/json" } }, accessToken);
}
