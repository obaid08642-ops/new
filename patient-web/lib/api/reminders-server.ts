import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for active medication reminders. */
export function getPatientMedicationReminders(accessToken: string) {
  return callPatientApi("/health/reminders", {}, accessToken);
}
