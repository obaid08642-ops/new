import { callPatientApi } from "@/lib/api/upstream";

/**
 * Server-only reads for the patient dashboard. No browser token or fallback data.
 * The name comes from GET /users/me/display (the bounded display DTO: display_name, avatar, locale), not from the whole
 * medical profile document, which the dashboard has no use for.
 */
export function getPatientDashboardProfile(accessToken: string) {
  return callPatientApi("/users/me/display", {}, accessToken);
}

export function getPatientDashboardUpcomingAppointment(accessToken: string) {
  return callPatientApi("/home/upcoming-appointment", {}, accessToken);
}
