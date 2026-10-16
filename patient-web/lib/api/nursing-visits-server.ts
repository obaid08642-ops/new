import { callPatientApi } from "@/lib/api/upstream";

/** The signed-in patient's own nursing bookings. `/nursing/visits` is the nurse's job list and answers 403 to a patient. */
export function getPatientNursingVisits(accessToken: string) {
  return callPatientApi("/nursing/bookings/mine", { method: "GET", cache: "no-store", headers: { accept: "application/json" } }, accessToken);
}
