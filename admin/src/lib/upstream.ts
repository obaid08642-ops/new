import { MAX_RETRIES, pause, planRetries, retryAfterTooLong, retryDelayMs, shouldRetryStatus, timeoutFor } from './request-policy';

/** Why a call to the backend failed, so the handler can answer 504, 502, or nothing (the browser left). */
export class UpstreamError extends Error {
  constructor(readonly kind: 'timeout' | 'unavailable' | 'aborted') {
    super(`upstream_${kind}`);
  }
}

export interface UpstreamInit extends RequestInit {
  /** 0 turns the timeout off (a stream that stays open). Otherwise 15 s; 60 s for imports and exports; 45 s for AI. */
  timeoutMs?: number;
  /** True when the browser sent its own idempotency key, so the write may be tried again with it. */
  callerKey?: boolean;
}

/**
 * One call from the admin BFF to the backend under the request policy (15.1): a timeout until the response starts,
 * cancellation through `signal` (the browser went away), and a try again only where that is safe (a read, or a write
 * with the browser's own idempotency key; 429 for every request), waiting what Retry-After says. A failure throws
 * UpstreamError; a response is returned as it is.
 */
export async function upstreamFetch(url: string, init: UpstreamInit = {}): Promise<Response> {
  const { timeoutMs, callerKey, signal: callerSignal, ...options } = init;
  const plan = planRetries(options.method, !!callerKey);
  const limit = timeoutMs === 0 ? 0 : timeoutFor(new URL(url).pathname, options.body, timeoutMs);
  for (let attempt = 0; ; attempt++) {
    if (callerSignal?.aborted) throw new UpstreamError('aborted');
    const controller = new AbortController();
    let timedOut = false;
    const onCallerAbort = () => controller.abort();
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
    const timer = limit > 0 ? setTimeout(() => { timedOut = true; controller.abort(); }, limit) : null;
    const done = () => { if (timer) clearTimeout(timer); callerSignal?.removeEventListener('abort', onCallerAbort); };
    let response: Response;
    try {
      response = await fetch(url, { ...options, signal: controller.signal });
    } catch {
      done();
      if (callerSignal?.aborted) throw new UpstreamError('aborted');
      if (plan.retryTransport && attempt < MAX_RETRIES) {
        await pause(retryDelayMs(attempt), callerSignal).catch(() => { throw new UpstreamError('aborted'); });
        continue;
      }
      throw new UpstreamError(timedOut ? 'timeout' : 'unavailable');
    }
    done();
    const retryAfter = response.headers.get('retry-after');
    if (!response.ok && attempt < MAX_RETRIES && shouldRetryStatus(response.status, plan) && !retryAfterTooLong(retryAfter)) {
      await pause(retryDelayMs(attempt, retryAfter), callerSignal).catch(() => { throw new UpstreamError('aborted'); });
      continue;
    }
    return response;
  }
}

/** The status and body for a failed upstream call: 504 on a timeout, 502 otherwise, with a Retry-After. */
export function upstreamFailure(error: unknown): { status: number; code: string } {
  if (error instanceof UpstreamError && error.kind === 'timeout') return { status: 504, code: 'admin_backend_timeout' };
  return { status: 502, code: 'admin_backend_unavailable' };
}
