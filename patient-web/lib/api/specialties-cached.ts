import { patientApiUrl } from "@/lib/api/upstream";
import { publicReadSignal } from "@/lib/api/public-timeout";

/**
 * GET /care/specialties for the doctors list chips (counts per specialty). The counts change slowly and the list page is
 * static/ISR, so this read goes through the Next data cache for five minutes (the specialties page uses the no-store read).
 * No credential is sent. A failure just leaves the chips out.
 */
export async function getCachedSpecialties(): Promise<Response | null> {
  try {
    return await fetch(patientApiUrl("/care/specialties"), { signal: publicReadSignal(), headers: { Accept: "application/json" }, next: { revalidate: 300 } });
  } catch {
    return null;
  }
}
