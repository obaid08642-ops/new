import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";

/**
 * F82-3: one public read for the static/ISR entity pages (doctor, specialty and city pages). No credential, no cookie: the
 * answer is the same for everyone and goes through the Next data cache for `revalidate` seconds.
 *
 * - 2xx: the parsed body.
 * - 4xx (the entity does not exist): `null`, the page answers not-found.
 * - no answer, or 5xx: throws, so the page is not rendered at all and Next keeps the last good copy (stale-if-error, #302)
 *   instead of caching a not-found for an outage.
 */
export async function readPublicEntity<T>(url: string, revalidate: number): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate } });
  } catch {
    throw new PublicDataUnavailableError(url);
  }
  if (res.status >= 500) throw new PublicDataUnavailableError(url);
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as T | null;
}
