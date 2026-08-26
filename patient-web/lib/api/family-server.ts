import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for the current patient's family member list. */
export function getPatientFamilyMembers(accessToken: string) {
  return callPatientApi("/family/members", {}, accessToken);
}
