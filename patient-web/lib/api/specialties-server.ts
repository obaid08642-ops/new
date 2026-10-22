import { patientApiUrl } from "@/lib/api/upstream";
import { publicReadSignal } from "@/lib/api/public-timeout";

function specialtiesPath(path: string) {
  if (path !== "/care/specialties") throw new Error("invalid_specialties_path");
  return path;
}

/** Public discovery contract: no patient token is sent and no private route is reachable. */
export async function getPublicSpecialties(): Promise<Response | null> {
  try {
    return await fetch(patientApiUrl(specialtiesPath("/care/specialties")), { signal: publicReadSignal(),
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}
