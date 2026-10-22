// 15.1 — one request policy for the patient app: how long a request may take, which failures may be tried again, and how
// long to wait before the next try. Pure functions, so every rule is unit-tested without a network.

export const DEFAULT_TIMEOUT_MS = 15_000;
export const UPLOAD_TIMEOUT_MS = 60_000;
export const AI_TIMEOUT_MS = 45_000;
/** A request is tried at most 1 + MAX_RETRIES times. */
export const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8_000;
/** A server asking for a longer pause than this is not waited for: the user is told to try again instead. */
const MAX_RETRY_AFTER_MS = 30_000;

const SAFE_METHODS = new Set(['GET', 'HEAD']);
const AI_PATH = /^\/ai(\/|\?|$)/;

/** 15 s by default, 60 s for an upload (a FormData body), 45 s for the AI routes; a caller may pass its own. */
export function timeoutFor(endpoint: string, body: unknown, explicit?: number): number {
  if (typeof explicit === 'number' && explicit > 0) return explicit;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return UPLOAD_TIMEOUT_MS;
  if (AI_PATH.test(endpoint)) return AI_TIMEOUT_MS;
  return DEFAULT_TIMEOUT_MS;
}

export interface RetryPlan {
  /** A timeout or a lost connection may be tried again (the request may or may not have reached the server). */
  retryTransport: boolean;
  /** 502, 503 and 504 may be tried again. */
  retryGateway: boolean;
}

/**
 * Only a safe read, or a write that carries the caller's own idempotency key (the server recognises the replay), is tried
 * again after an unknown outcome. A write whose key this client invented for one call is never replayed on a timeout.
 */
export function planRetries(method: string | undefined, callerSuppliedKey: boolean): RetryPlan {
  const safe = SAFE_METHODS.has(String(method || 'GET').toUpperCase());
  const allowed = safe || callerSuppliedKey;
  return { retryTransport: allowed, retryGateway: allowed };
}

/** 429 is a refusal before any work was done, so it is the one status every request may be tried again on. */
export function shouldRetryStatus(status: number, plan: RetryPlan): boolean {
  if (status === 429) return true;
  return plan.retryGateway && (status === 502 || status === 503 || status === 504);
}

/** `Retry-After` as milliseconds: whole seconds, or an HTTP date. Null when absent or unreadable. */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | null {
  if (!value) return null;
  const text = value.trim();
  if (/^\d+$/.test(text)) return Number(text) * 1000;
  const at = Date.parse(text);
  return Number.isNaN(at) ? null : Math.max(0, at - now);
}

/** The wait before try `attempt + 1`: the server's `Retry-After` when it sent one, else exponential backoff with full jitter. */
export function retryDelayMs(attempt: number, retryAfter?: string | null, random: () => number = Math.random, now: number = Date.now()): number {
  const asked = parseRetryAfter(retryAfter, now);
  if (asked !== null) return Math.min(asked, MAX_RETRY_AFTER_MS);
  return Math.floor(random() * Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt));
}

/** Whether the server asked for a pause longer than the client will wait. */
export function retryAfterTooLong(retryAfter?: string | null, now: number = Date.now()): boolean {
  const asked = parseRetryAfter(retryAfter, now);
  return asked !== null && asked > MAX_RETRY_AFTER_MS;
}

export interface GuardedSignal {
  signal: AbortSignal;
  cleanup: () => void;
  timedOut: () => boolean;
  callerAborted: () => boolean;
}

/** One signal that fires when the caller's signal does (the screen closed) or when the timeout is reached. */
export function guardedSignal(callerSignal: AbortSignal | null | undefined, timeoutMs: number): GuardedSignal {
  const controller = new AbortController();
  let timedOut = false;
  const onCallerAbort = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', onCallerAbort);
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener?.('abort', onCallerAbort);
    },
    timedOut: () => timedOut,
    callerAborted: () => !!callerSignal?.aborted,
  };
}

/** Waits `ms`, ending early (and rejecting) when the caller's signal aborts. */
export function pause(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('REQUEST_ABORTED'));
    const timer = setTimeout(() => {
      signal?.removeEventListener?.('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('REQUEST_ABORTED'));
    };
    signal?.addEventListener?.('abort', onAbort);
  });
}
