import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for a patient's notification list. */
/** `locale` (#443): the server writes the titles and bodies in the page's language. */
export function getPatientNotifications(accessToken: string, locale: string) {
  return callPatientApi(`/notifications?lang=${encodeURIComponent(locale)}`, {}, accessToken);
}
