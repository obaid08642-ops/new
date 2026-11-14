import { BadGatewayException, GatewayTimeoutException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { currentLogContext } from './structured-logger';
import { BreakerOptions, CircuitBreakerService, BreakerHandle } from './circuit-breaker.service';

/**
 * 15.7 — slow or failing dependencies.
 *
 * Every outbound call to a payment gateway, SMS/email provider, LiveKit, S3 or
 * an AI model goes through these two helpers so it has BOTH:
 *
 *  - a hard abort. A circuit breaker caps how long a call may be *waited on*,
 *    but opossum cannot cancel a socket. Without an AbortSignal a hung gateway
 *    keeps the request open after the breaker has already given up, so the
 *    timeout and the breaker disagree and the event loop fills with orphans.
 *  - a shared, named breaker, so N failing callers shed load together instead
 *    of each opening their own connection.
 *
 * The work function MUST be args-driven and stateless: a breaker is cached by
 * name, so a closure over per-request state becomes the function a *later*
 * caller executes (see circuit-breaker.service.ts, Q81).
 */

/** Per-call timeout for a payment-gateway HTTP call (ms). Env-overridable. */
export const gatewayTimeoutMs = (): number =>
  Number(process.env.PAYMENT_GATEWAY_TIMEOUT_MS) || 10_000;

const extLogger = new Logger('ExternalCall');
const isTimeout = (e: any) => e?.name === 'TimeoutError' || e?.name === 'AbortError';

export interface TimedFetchOptions {
  /** Hard limit for ONE attempt (ms). Default: the payment-gateway timeout (10 s). */
  timeoutMs?: number;
  /** Extra attempts after the first (0..2). Honoured only for a request that is safe to repeat. */
  retries?: number;
  /** Name used in the log line (never put a URL with a token or a payload here). */
  label?: string;
  /** What the caller answers when every attempt timed out (default `external_call_timeout`). */
  timeoutCode?: string;
  /** 504 (default) or 503 (the older externalFetch answer). */
  timeoutStatus?: 503 | 504;
  /** Base of the exponential backoff (ms). Default 250. */
  backoffMs?: number;
  /** Test hook: replaces the real wait between attempts. */
  sleep?: (ms: number) => Promise<void>;
}

export const MAX_EXTERNAL_RETRIES = 2;

/** A repeat is safe for a read, or for a write that carries an idempotency key the other side honours. */
export function isSafeToRepeat(init?: RequestInit): boolean {
  const method = String(init?.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return true;
  const h = init?.headers;
  if (!h) return false;
  if (typeof Headers !== 'undefined' && h instanceof Headers) return h.has('idempotency-key');
  if (Array.isArray(h)) return h.some(([k]) => String(k).toLowerCase() === 'idempotency-key');
  return Object.keys(h as Record<string, string>).some((k) => k.toLowerCase() === 'idempotency-key');
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);

/**
 * fetch with a hard timeout per attempt and a bounded retry (at most {@link MAX_EXTERNAL_RETRIES}, with exponential
 * backoff), and only for requests that are safe to repeat. A payment or refund POST without an idempotency key is
 * therefore sent exactly once. When the time runs out the caller gets a typed 504 (never a raw TypeError) and the
 * log line carries the request id, so one support lookup finds the whole request.
 */
export async function timedFetch(url: string, init?: RequestInit, opts: TimedFetchOptions = {}): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? gatewayTimeoutMs();
  const attempts = 1 + (isSafeToRepeat(init) ? Math.min(Math.max(opts.retries ?? 0, 0), MAX_EXTERNAL_RETRIES) : 0);
  const base = opts.backoffMs ?? 250;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (RETRYABLE_STATUS.has(res.status) && i < attempts - 1) {
        lastErr = undefined;
        await sleep(base * 2 ** i);
        continue;
      }
      return res;
    } catch (e: any) {
      lastErr = e;
      if (i < attempts - 1) await sleep(base * 2 ** i);
    }
  }
  if (isTimeout(lastErr)) {
    extLogger.warn(`${opts.label || 'external call'} timed out after ${timeoutMs} ms x${attempts} (request ${currentLogContext().requestId ?? '-'})`);
    const code = opts.timeoutCode || 'external_call_timeout';
    throw opts.timeoutStatus === 503 ? new ServiceUnavailableException(code) : new GatewayTimeoutException(code);
  }
  throw lastErr;
}

/**
 * fetch with a hard timeout (no retry). A timeout becomes a typed
 * `ServiceUnavailableException('external_call_timeout')`.
 */
export function externalFetch(url: string, init?: RequestInit, timeoutMs = gatewayTimeoutMs()): Promise<Response> {
  return timedFetch(url, init, { timeoutMs, retries: 0, timeoutStatus: 503 });
}

/**
 * Run one external operation behind a timeout + a shared circuit breaker.
 *
 * `fallback` is invoked as `fallback(...callerArgs, err)` — the caller's own
 * arguments first, the failure LAST. It must re-throw typed errors (timeouts,
 * 503s) so the user sees what actually happened, and map everything else to the
 * generic "temporarily unavailable".
 */
export async function runExternalCall<T>(
  breakers: CircuitBreakerService | undefined,
  name: string,
  fn: (...args: any[]) => Promise<T>,
  args: any[],
  fallback: (...args: any[]) => T | Promise<T>,
  timeoutMs = gatewayTimeoutMs(),
  options: BreakerOptions = {},
): Promise<T> {
  const timeout = timeoutMs ?? gatewayTimeoutMs();
  const opts: BreakerOptions = { timeout, ...options };
  // The timeout is unconditional: 15.7 asks for a timeout AND a breaker on
  // every external call, so a caller with no breaker injected must still get
  // the abort. Only the breaker is optional.
  const action = async (...callArgs: any[]) =>
    withTimeout(() => fn(...callArgs), timeout);
  if (!breakers) return action(...args);
  return breakers.create(name, action, opts, fallback).fire(...args);
}

/** Reject with a typed timeout once `ms` elapses. */
async function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ServiceUnavailableException('external_call_timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * The standard fallback for a failed or short-circuited external call.
 *
 * opossum runs the fallback after ANY failed attempt, not only on an open
 * circuit, so an already-typed reason is re-thrown as-is; opossum's own
 * "Timed out after Nms" is named as a timeout; anything else becomes the
 * generic "temporarily unavailable".
 */
export function externalUnavailable<T>(...args: unknown[]): T {
  // Breaker fallback contract: (...callerArgs, err) — the failure is the LAST
  // argument. Reading it first would receive the caller's body as "the error".
  const err = args[args.length - 1];
  if (err instanceof ServiceUnavailableException || err instanceof BadGatewayException) throw err;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (/timed out after/i.test(msg)) throw new ServiceUnavailableException('external_call_timeout');
  throw new BadGatewayException('external_call_unavailable');
}

/** Convenience for callers that only need the typed handle. */
export function breakerFor<T>(
  breakers: CircuitBreakerService | undefined,
  name: string,
  fn: (...args: any[]) => Promise<T>,
  fallback: (...args: any[]) => T | Promise<T>,
  timeoutMs?: number,
): BreakerHandle<T> | undefined {
  if (!breakers) return undefined;
  const timeout = timeoutMs ?? gatewayTimeoutMs();
  return breakers.create(
    name,
    async (...callArgs: any[]) => withTimeout(() => fn(...callArgs), timeout),
    { timeout },
    fallback,
  );
}