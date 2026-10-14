import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
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

/**
 * fetch with a hard timeout. A timeout becomes a typed
 * `ServiceUnavailableException('external_call_timeout')` — the caller's
 * user-facing answer is then "payment_gateway_timeout", never a raw TypeError.
 */
export async function externalFetch(url: string, init?: RequestInit, timeoutMs = gatewayTimeoutMs()): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e: any) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
      throw new ServiceUnavailableException('external_call_timeout');
    }
    throw e;
  }
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