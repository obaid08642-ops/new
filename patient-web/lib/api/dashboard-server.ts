import { callPatientApi } from "@/lib/api/upstream";

/** Server-only reads for the patient dashboard. No browser token or fallback data. */
export function getPatientDashboardProfile(accessToken: string) {
  return callPatientApi("/users/me/profile", {}, accessToken);
}

export function getPatientDashboardUpcomingAppointment(accessToken: string) {
  return callPatientApi("/home/upcoming-appointment", {}, accessToken);
}
