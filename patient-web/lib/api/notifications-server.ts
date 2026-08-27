import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for a patient's notification list. */
export function getPatientNotifications(accessToken: string) {
  return callPatientApi("/notifications", {}, accessToken);
}
