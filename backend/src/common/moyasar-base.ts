import { ServiceUnavailableException } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';

/**
 * Moyasar API base URL. MOYASAR_API_BASE points the gateway client at a sandbox or at the local fake used by the
 * live journeys (tools/live/fake_moyasar.py); production must stay on HTTPS.
 */
export function moyasarBase(): string {
  const base = (process.env.MOYASAR_API_BASE || 'https://api.moyasar.com/v1').replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production' && !base.startsWith('https://')) throw new Error('MOYASAR_API_BASE must be https in production');
  return base;
}


/** Per-call timeout for Moyasar HTTP calls (ms). */
const moyasarTimeoutMs = () => Number(process.env.MOYASAR_TIMEOUT_MS) || 15000;

class MoyasarUpstreamError extends Error {
  constructor(readonly status: number) { super(`moyasar_upstream_${status}`); }
}

async function timedFetch(url: string, init: RequestInit, ms: number): Promise<Response> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
  // A 5xx is an outage (counted by the breaker); 4xx is an answer for the caller.
  if (res.status >= 500) throw new MoyasarUpstreamError(res.status);
  return res;
}

// The payments adapter is constructed outside Nest DI, so it shares this breaker registry.
let breakers = new CircuitBreakerService();

/** @internal specs only: start each spec with a closed circuit. */
export function resetMoyasarBreakerForTests(): void { breakers = new CircuitBreakerService(); }

/**
 * 15.7: every Moyasar HTTP call runs with a timeout behind the 'moyasar:http'
 * breaker. Network errors, timeouts and 5xx count as failures; while the
 * circuit is open calls fail at once with 503 moyasar_unavailable.
 */
export async function moyasarFetch(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await breakers.call('moyasar:http', timedFetch, [url, init, moyasarTimeoutMs()]);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'EOPENBREAKER') throw new ServiceUnavailableException('moyasar_unavailable');
    throw e;
  }
}
