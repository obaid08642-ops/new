import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for the current patient's read-only vital summary. */
export function getPatientVitalSummary(accessToken: string) {
  return callPatientApi("/health/vitals/summary", {}, accessToken);
}

export function getPatientVitalHistory(accessToken: string) {
  return callPatientApi("/health/vitals?limit=100", {}, accessToken);
}

export function getPatientHealthScore(accessToken: string) {
  return callPatientApi("/health/score", {}, accessToken);
}

export function getPatientReports(accessToken: string) {
  return callPatientApi("/health/reports", {}, accessToken);
}
