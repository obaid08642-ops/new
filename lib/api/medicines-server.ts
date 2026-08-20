import { medicineQuery } from "@/lib/api/medicines";
import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for catalog reads initiated by private patient pages. */
export function getPatientMedicines(accessToken: string, search: { q?: string; page: number }) {
  return callPatientApi(medicineQuery(search), {}, accessToken);
}

export function getPatientMedicine(accessToken: string, medicineId: string) {
  return callPatientApi(`/medicines/${medicineId}/details`, {}, accessToken);
}
