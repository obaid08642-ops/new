// 15.1 — the request policy of the admin BFF (server side; the same rules as patient-web/lib/api/request-policy.ts): how long a call to the backend may take, which failures may be tried
// again and how long to wait. The rules are those of the apps (patient-app/src/utils/requestPolicy.ts); two numbers differ
// because a page request must not sit and wait: one retry, and a Retry-After over 5 s is not waited for.

export const DEFAULT_TIMEOUT_MS = 15_000;
export const UPLOAD_TIMEOUT_MS = 60_000;
export const AI_TIMEOUT_MS = 45_000;
export const MAX_RETRIES = 1;
const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 2_000;
const MAX_RETRY_AFTER_MS = 5_000;

const SAFE_METHODS = new Set(["GET", "HEAD"]);
const AI_PATH = /^\/api\/v1\/(admin\/)?ai(\/|\?|$)/;
const UPLOAD_PATH = /^\/api\/v1\/(storage\/upload|uploads?|admin\/[^?]*\/(import|upload|export))(\/|\?|$)/;

/** 15 s by default, 60 s for an upload, 45 s for the AI routes, or the caller's value. */
export function timeoutFor(path: string, body: unknown, explicit?: number): number {
  if (typeof explicit === "number" && explicit > 0) return explicit;
  if ((typeof FormData !== "undefined" && body instanceof FormData) || UPLOAD_PATH.test(path)) return UPLOAD_TIMEOUT_MS;
  if (AI_PATH.test(path)) return AI_TIMEOUT_MS;
  return DEFAULT_TIMEOUT_MS;
}

export interface RetryPlan { retryTransport: boolean; retryGateway: boolean }

/** A safe read, or a write that carries the browser's own idempotency key, may be tried again after an unknown outcome. */
export function planRetries(method: string | undefined, callerSuppliedKey: boolean): RetryPlan {
  const allowed = SAFE_METHODS.has(String(method || "GET").toUpperCase()) || callerSuppliedKey;
  return { retryTransport: allowed, retryGateway: allowed };
}

/** 429 means the backend did no work, so any request may be tried again on it; 502, 503 and 504 only where the plan allows. */
export function shouldRetryStatus(status: number, plan: RetryPlan): boolean {
  return status === 429 || (plan.retryGateway && (status === 502 || status === 503 || status === 504));
}

/** `Retry-After` in milliseconds (seconds or an HTTP date); null when absent or unreadable. */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | null {
  if (!value) return null;
  const text = value.trim();
  if (/^\d+$/.test(text)) return Number(text) * 1000;
  const at = Date.parse(text);
  return Number.isNaN(at) ? null : Math.max(0, at - now);
}

export function retryAfterTooLong(value: string | null | undefined, now: number = Date.now()): boolean {
  const asked = parseRetryAfter(value, now);
  return asked !== null && asked > MAX_RETRY_AFTER_MS;
}

/** The wait before the next try: the backend's Retry-After, else exponential backoff with full jitter. */
export function retryDelayMs(attempt: number, retryAfter?: string | null, random: () => number = Math.random, now: number = Date.now()): number {
  const asked = parseRetryAfter(retryAfter, now);
  if (asked !== null) return Math.min(asked, MAX_RETRY_AFTER_MS);
  return Math.floor(random() * Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt));
}

/** Waits `ms`; rejects early when the caller's signal aborts (the browser went away). */
export function pause(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("request_aborted"));
    const timer = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(timer); reject(new Error("request_aborted")); };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
