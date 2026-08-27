import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for the current patient's prescription summary list. */
export function getPatientPrescriptions(accessToken: string) {
  return callPatientApi("/prescriptions/mine", {}, accessToken);
}
