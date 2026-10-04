import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for the current patient's prescription summary list. */
export function getPatientPrescriptions(accessToken: string) {
  return callPatientApi("/prescriptions/mine", {}, accessToken);
}

/** dd9c105: one of the current patient's prescriptions (backend answers 404 for anyone else's). */
export function getPatientPrescription(prescriptionId: string, accessToken: string) {
  return callPatientApi(`/prescriptions/${encodeURIComponent(prescriptionId)}`, {}, accessToken);
}
