import { MAX_RETRIES, guardedSignal, pause, planRetries, retryAfterTooLong, retryDelayMs, shouldRetryStatus, timeoutFor } from './requestPolicy';

/**
 * `fetch` under the same policy as the axios client (15.1): a timeout (15 s; 60 s for an upload; 45 s for the AI routes; or
 * `timeoutMs`), cancellation through `signal`, and a try again only where that is safe (a read, or a write carrying the
 * caller's own idempotency key; 429 for every request), waiting what `Retry-After` says. It is for the calls that have no
 * session yet (sign-in, refresh, password reset), which cannot go through the authenticated client.
 * A timeout rejects with `REQUEST_TIMEOUT`, a cancellation with `REQUEST_ABORTED`; any other failure rejects as fetch does.
 */
export async function timedFetch(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs, ...options } = init;
  const callerKey = new Headers(options.headers as HeadersInit | undefined).has('Idempotency-Key');
  const plan = planRetries(options.method, callerKey);
  const limit = timeoutFor(url.replace(/^https?:\/\/[^/]+(\/api\/v\d+)?/, ''), options.body, timeoutMs);
  for (let attempt = 0; ; attempt++) {
    if (options.signal?.aborted) throw new Error('REQUEST_ABORTED');
    const guard = guardedSignal(options.signal, limit);
    let response: Response;
    try {
      response = await fetch(url, { ...options, signal: guard.signal });
    } catch (e) {
      guard.cleanup();
      if (guard.callerAborted()) throw new Error('REQUEST_ABORTED');
      if (plan.retryTransport && attempt < MAX_RETRIES) {
        await pause(retryDelayMs(attempt), options.signal);
        continue;
      }
      if (guard.timedOut()) throw new Error('REQUEST_TIMEOUT');
      throw e;
    }
    guard.cleanup();
    const retryAfter = response.headers?.get?.('Retry-After');
    if (!response.ok && attempt < MAX_RETRIES && shouldRetryStatus(response.status, plan) && !retryAfterTooLong(retryAfter)) {
      await pause(retryDelayMs(attempt, retryAfter), options.signal);
      continue;
    }
    return response;
  }
}
