import type { DiagnosticDomain } from "@/lib/api/diagnostics";
import { callPatientApi, patientApiUrl } from "@/lib/api/upstream";

/** Server-only BFF boundary for private lab and radiology booking reads. */
export function getDiagnosticBookings(accessToken: string, domain: DiagnosticDomain) {
  return callPatientApi(`/${domain}/bookings/mine`, {}, accessToken);
}

export function getDiagnosticBooking(accessToken: string, domain: DiagnosticDomain, bookingId: string) {
  return callPatientApi(`/${domain}/bookings/${bookingId}`, {}, accessToken);
}

export async function getCompatibleLabProviders(serviceId: string): Promise<any[]> {
  try {
    const response = await fetch(patientApiUrl(`/labs/compatible-providers?testIds=${encodeURIComponent(serviceId)}`), { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json().catch(() => []);
    return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
  } catch { return []; }
}
