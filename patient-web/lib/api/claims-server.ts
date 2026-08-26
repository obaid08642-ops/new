import { callPatientApi } from "@/lib/api/upstream";

export function getPatientClaims(accessToken: string) {
  return callPatientApi("/insurance/claims", {}, accessToken);
}
