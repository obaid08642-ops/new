import { callPatientApi } from "@/lib/api/upstream";

/** Read-only boundary until PATCH ownership, CSRF, and transition tests are closed. */
export function getPatientNotificationSettings(accessToken: string) {
  return callPatientApi("/users/me/notification-settings", {}, accessToken);
}
