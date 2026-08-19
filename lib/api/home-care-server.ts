import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for patient home-care booking lists. */
export function getPatientHomeCareBookings(accessToken: string) {
  return callPatientApi("/home-care/bookings/my", {}, accessToken);
}
