import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";
import { publicReadSignal } from "@/lib/api/public-timeout";

/**
 * F82-3: one public read for the static/ISR entity pages (doctor, specialty and city pages). No credential, no cookie: the
 * answer is the same for everyone and goes through the Next data cache for `revalidate` seconds.
 *
 * - 2xx: the parsed body.
 * - 4xx (the entity does not exist) or an empty 2xx body: `null`, the page answers not-found. A `null` is never kept in the
 *   cache: it is re-read once with `no-store`, so a policy published a minute later shows at once (A-14); found answers keep `revalidate`.
 * - no answer, or 5xx: throws, so the page is not rendered at all and Next keeps the last good copy (stale-if-error, #302)
 *   instead of caching a not-found for an outage.
 */
export async function readPublicEntity<T>(url: string, revalidate: number): Promise<T | null> {
  const first = await readOnce<T>(url, { next: { revalidate } });
  if (first !== null) return first;
  // A 2xx with an empty body (the legal service answers a missing policy that way, A-14) or a 4xx must not stay in the data
  // cache for `revalidate` seconds: the entity may be published a minute later. The retry is a different cache entry
  // (`no-store`), so what it reads is current and nothing of it is kept.
  return readOnce<T>(url, { cache: "no-store" });
}

async function readOnce<T>(url: string, options: Pick<RequestInit, "cache"> & { next?: { revalidate: number } }): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" }, ...options, signal: publicReadSignal() });
  } catch {
    throw new PublicDataUnavailableError(url);
  }
  if (res.status >= 500) throw new PublicDataUnavailableError(url);
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as T | null;
}
