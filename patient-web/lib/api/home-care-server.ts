import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for patient home-care booking lists. */
export function getPatientHomeCareBookings(accessToken: string) {
  return callPatientApi("/unified-bookings/mine", { method: "GET", cache: "no-store" }, accessToken);
}
