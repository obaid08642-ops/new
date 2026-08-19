import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for the current patient's read-only vital summary. */
export function getPatientVitalSummary(accessToken: string) {
  return callPatientApi("/health/vitals/summary", {}, accessToken);
}
