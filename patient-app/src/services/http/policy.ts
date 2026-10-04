/**
 * 15.1 — request policy: timeouts, retry eligibility, backoff with jitter, and
 * `Retry-After` parsing.
 *
 * Pure functions with injectable clock/random/sleep so the behaviour required by
 * the Phase 15 gate (timeout fires, retry honours `Retry-After`, no retry for a
 * non-idempotent POST) is testable without a network or a real timer.
 */
import type { BackendErrorCode } from './errorCatalog';

/**
 * A timeout on every request. The 15 s default stops the "waits forever" defect
 * the old client had; uploads and AI get longer budgets because they legitimately
 * take longer on a weak network.
 */
export const REQUEST_TIMEOUTS = {
  default: 15_000,
  upload: 60_000,
  ai: 45_000,
} as const;

export type RequestKind = keyof typeof REQUEST_TIMEOUTS;

export function timeoutForKind(kind: RequestKind | undefined): number {
  return REQUEST_TIMEOUTS[kind ?? 'default'] ?? REQUEST_TIMEOUTS.default;
}

/** HTTP methods that are safe to replay: no server-side state change. */
export const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** 1 initial attempt + 2 retries. */
export const DEFAULT_MAX_ATTEMPTS = 3;

export const RETRY_BASE_DELAY_MS = 300;
export const RETRY_MAX_DELAY_MS = 4_000;

/** Ceiling for a server-supplied `Retry-After`, so a bad header cannot hang the app. */
export const RETRY_AFTER_CEILING_MS = 30_000;

export function isSafeMethod(method: string | undefined): boolean {
  return SAFE_METHODS.has(String(method ?? 'GET').trim().toUpperCase());
}

/**
 * Retry eligibility (15.1): a safe method, or any request the caller marked
 * idempotent by supplying its own `Idempotency-Key`. The client auto-generates a
 * key for `@RequireIdempotency` routes, but an auto key only de-duplicates a
 * *single* attempt, so it must never unlock a replay.
 */
export function isRetryEligible(method: string | undefined, callerSuppliedIdempotencyKey: boolean): boolean {
  return isSafeMethod(method) || callerSuppliedIdempotencyKey === true;
}

/** Statuses worth replaying. 4xx other than 408/425/429 are the caller's fault. */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

/**
 * Parse `Retry-After` (both forms from RFC 9110: delta-seconds and HTTP-date).
 * Returns milliseconds, or null when the header is absent/unparsable.
 */
export function parseRetryAfter(headerValue: string | null | undefined, nowMs: number): number | null {
  if (headerValue == null) return null;
  const raw = String(headerValue).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    return Math.min(seconds * 1000, RETRY_AFTER_CEILING_MS);
  }

  const asDate = Date.parse(raw);
  if (Number.isNaN(asDate)) return null;
  return Math.min(Math.max(asDate - nowMs, 0), RETRY_AFTER_CEILING_MS);
}

/**
 * Exponential backoff with full jitter, `base * 2^(attempt-1)`, capped at
 * `RETRY_MAX_DELAY_MS`. `Retry-After` from the server always wins — it is a
 * server instruction, not a hint — but is still jittered a little so a fleet of
 * clients told to wait 30 s does not stampede at t+30 s exactly.
 */
export function computeRetryDelay(
  attempt: number,
  retryAfterMs: number | null,
  random: () => number = Math.random,
): number {
  if (retryAfterMs != null) {
    const jitterWindow = Math.min(RETRY_BASE_DELAY_MS, retryAfterMs);
    return Math.max(0, retryAfterMs - Math.round(jitterWindow * random()));
  }
  const exponential = RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, attempt - 1));
  const capped = Math.min(exponential, RETRY_MAX_DELAY_MS);
  // Full jitter: uniform in [0, capped].
  return Math.round(capped * random());
}

export interface RetryDecisionInput {
  method?: string;
  /** 1-based number of the attempt that just failed. */
  attempt: number;
  maxAttempts: number;
  callerSuppliedIdempotencyKey: boolean;
  /** Present when the attempt got an HTTP response. */
  status?: number | null;
  /** Transport-level failure: no response at all. */
  transportFailure?: boolean;
  /** The caller aborted (screen closed) or the timeout already fired. */
  cancelled?: boolean;
  retryAfterHeader?: string | null;
  nowMs?: number;
}

export interface RetryDecision {
  retry: boolean;
  delayMs: number;
  reason:
    | 'no_attempts_left'
    | 'not_idempotent'
    | 'cancelled'
    | 'status_not_retryable'
    | 'ok';
}

export function decideRetry(input: RetryDecisionInput): RetryDecision {
  const nowMs = input.nowMs ?? Date.now();
  const none: RetryDecision = { retry: false, delayMs: 0, reason: 'ok' };

  if (input.cancelled) return { retry: false, delayMs: 0, reason: 'cancelled' };
  if (!isRetryEligible(input.method, input.callerSuppliedIdempotencyKey)) {
    return { retry: false, delayMs: 0, reason: 'not_idempotent' };
  }
  if (input.attempt >= input.maxAttempts) {
    return { retry: false, delayMs: 0, reason: 'no_attempts_left' };
  }
  if (input.status != null && !isRetryableStatus(input.status)) {
    return { ...none, reason: 'status_not_retryable' };
  }

  const retryAfterMs = parseRetryAfter(input.retryAfterHeader, nowMs);
  return {
    retry: true,
    delayMs: computeRetryDelay(input.attempt, retryAfterMs),
    reason: 'ok',
  };
}

/** Catalogue code for the failures the transport itself produces. */
export const TRANSPORT_CATALOG_CODE: Record<'offline' | 'timeout' | 'cancelled', BackendErrorCode> = {
  offline: 'UNKNOWN_ERROR',
  timeout: 'SERVICE_UNAVAILABLE',
  cancelled: 'UNKNOWN_ERROR',
};
