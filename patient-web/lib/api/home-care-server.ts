import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for patient home-care booking lists. */
export function getPatientHomeCareBookings(accessToken: string) {
  // Journey 6: only home nursing, not every booking kind (pharmacy orders showed up as "service not available" rows).
  return callPatientApi("/unified-bookings/mine?kind=nursing", { method: "GET", cache: "no-store" }, accessToken);
}
