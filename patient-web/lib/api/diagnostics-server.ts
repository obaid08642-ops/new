import type { DiagnosticDomain } from "@/lib/api/diagnostics";
import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for private lab and radiology booking reads. */
export function getDiagnosticBookings(accessToken: string, domain: DiagnosticDomain) {
  return callPatientApi(`/${domain}/bookings/mine`, {}, accessToken);
}

export function getDiagnosticBooking(accessToken: string, domain: DiagnosticDomain, bookingId: string) {
  return callPatientApi(`/${domain}/bookings/${bookingId}`, {}, accessToken);
}
