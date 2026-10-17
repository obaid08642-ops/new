import { patientApiUrl } from "@/lib/api/upstream";
import { publicReadSignal } from "@/lib/api/public-timeout";
import { doctorQuery } from "@/lib/api/doctors";

/** One public read: the parsed body, or `failed` when the backend did not answer or answered with an error. */
export type PublicRead = { failed: false; body: unknown } | { failed: true };

/**
 * Issue 1550: the reads a service landing page makes for a guest. They go to backend routes that are public (@Public) and
 * send no credential and no cookie, so nothing personal can come back. Never cached: the list is the server's of now.
 */
export async function readPublic(path: string): Promise<PublicRead> {
  try {
    const response = await fetch(patientApiUrl(path), { headers: { Accept: "application/json" }, signal: publicReadSignal(), cache: "no-store" });
    if (!response.ok) return { failed: true };
    return { failed: false, body: await response.json().catch(() => null) };
  } catch {
    return { failed: true };
  }
}

/** GET /home/offers: the live offer campaigns (title, provider, price), public since issue 1550. */
export const readPublicOffers = () => readPublic("/home/offers");
/** GET /insurance/companies: the active insurers and their plan tiers. */
export const readPublicInsurers = () => readPublic("/insurance/companies");
/** GET /nursing/catalog: the published home care services and their prices. */
export const readPublicHomeCareServices = () => readPublic("/nursing/catalog");
/** GET /providers?type=home_care: the published home care providers (public discovery filter on the backend). */
export const readPublicHomeCareProviders = () => readPublic("/providers?type=home_care");
/** GET /care/doctors?specialty=…: the published doctors of one specialty, with their consultation price. */
export const readPublicDoctorsOf = (specialty: string) => readPublic(doctorQuery({ specialty }));
/**
 * GET /providers?insurance_company=…: the published providers that accept one insurer (its network); the same public discovery
 * filter as above. The insurer id is one the public GET /insurance/companies listed, never a value typed into the URL.
 */
export const readPublicNetworkProviders = (companyId: string, type?: string) => {
  const query = new URLSearchParams({ insurance_company: companyId });
  if (type) query.set("type", type);
  return readPublic(`/providers?${query.toString()}`);
};
