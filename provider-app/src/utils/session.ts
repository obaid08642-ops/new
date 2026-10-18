/**
 * Session start decisions. Two mistakes lived in the context:
 *  - "online" was a HEAD request to https://1.1.1.1 (a third party); when it failed, a signed-in provider (and any new
 *    visitor) was shown "your account is under review";
 *  - any failure of POST /provider/auth/refresh, a 502 or a timeout included, signed the provider out and wiped the session.
 */
export type RefreshOutcome = 'ok' | 'denied' | 'unreachable';

/** `res` is null when the request itself failed (no network, timeout). Only a refusal of the session logs the provider out. */
export function refreshOutcome(res: { ok: boolean; status: number } | null): RefreshOutcome {
  if (!res) return 'unreachable';
  if (res.ok) return 'ok';
  if ([400, 401, 403, 404].includes(res.status)) return 'denied'; // the refresh token or session is refused
  return 'unreachable';                                           // 408, 429, 5xx: the server is not answering properly, keep the session
}

/** The app's own API is the only server it needs: any HTTP answer means the network is up, only a thrown fetch means it is not. */
export async function apiReachable(apiBase: string, fetchFn: typeof fetch = fetch, timeoutMs = 8000): Promise<boolean> {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    await fetchFn(`${apiBase}/health/liveness`, { method: 'GET', signal: ctl?.signal });
    return true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
