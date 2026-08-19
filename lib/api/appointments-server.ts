import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for private appointment reads. */
export function getPatientAppointments(accessToken: string) {
  return callPatientApi("/care/appointments", {}, accessToken);
}

export function getPatientAppointment(accessToken: string, appointmentId: string) {
  return callPatientApi(`/care/appointments/${appointmentId}`, {}, accessToken);
}
