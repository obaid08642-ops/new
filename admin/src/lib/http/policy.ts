/**
 * 15.1 — request policy for the admin's single HTTP client.
 *
 * Everything here is pure and injectable (clock, RNG, sleep) so the three
 * required verifications — the timeout fires, a retry honours `Retry-After`,
 * a non-idempotent POST without a key is never retried — are decided by real
 * code paths rather than by prose.
 *
 * The BFF warning in the plan applies to the retry rule specifically: a slow
 * admin write that the operator retries by hand must not become a duplicate,
 * so an unsafe method is only ever retried when the caller supplied a real
 * `idempotency-key` that the server can deduplicate on.
 */

export type RequestKind = 'default' | 'upload' | 'ai';

/** 15s by default, 60s for uploads, 45s for AI. */
export const TIMEOUTS: Readonly<Record<RequestKind, number>> = Object.freeze({
  default: 15_000,
  upload: 60_000,
  ai: 45_000,
});

/** Methods that are safe to replay with no idempotency key of their own. */
export const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

export const IDEMPOTENCY_HEADER = 'idempotency-key';

/** Retry budget: one initial attempt plus two retries. */
export const DEFAULT_MAX_ATTEMPTS = 3;

export const BASE_BACKOFF_MS = 300;
export const MAX_BACKOFF_MS = 4_000;

/**
 * `Retry-After` is honoured up to this ceiling. A backend under load can ask
 * for minutes; blocking an operator's HTTP handler for that long would be worse
 * than returning a retryable error, so the ceiling is deliberate and reported
 * through `AdminApiError.retryAfterMs`.
 */
export const MAX_HONOURED_RETRY_AFTER_MS = 60_000;

/**
 * Path markers for requests whose server-side work is an AI call and therefore
 * needs the longer AI budget. Mirrors the backend controllers:
 * `modules/ai/*` (`@Controller('ai')`, `@Controller('ai/content-review')`) and
 * `modules/medicines/medicines.controller.ts` `admin/image-suggestions`.
 */
const AI_PATH_MARKERS = ['/ai/', '/ai?', '/ai#', '/ai/content-review', '/image-suggestions'];

export function isSafeMethod(method: string | undefined | null): boolean {
  return SAFE_METHODS.has((method || 'GET').toUpperCase());
}

export function readHeader(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) return null;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) return headers.get(name);
  if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === name.toLowerCase());
    return found ? found[1] : null;
  }
  const record = headers as Record<string, string>;
  const key = Object.keys(record).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? record[key] : null;
}

/**
 * True only when the request carries a key the *caller* supplied and will reuse
 * across the retry. A key minted per attempt would make a non-idempotent POST
 * look replayable, so the caller must hand the same one to every attempt — which
 * the client does, because retries reuse the same header set.
 */
export function hasIdempotencyKey(headers: HeadersInit | undefined): boolean {
  const value = readHeader(headers, IDEMPOTENCY_HEADER);
  return typeof value === 'string' && value.trim().length > 0;
}

/** 15.1: retries only for safe requests, or requests carrying an idempotency key. */
export function isRetrySafe(method: string | undefined, headers: HeadersInit | undefined): boolean {
  return isSafeMethod(method) || hasIdempotencyKey(headers);
}

const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([408, 425, 429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

/**
 * `Retry-After` as delta-seconds or an HTTP-date. Returns milliseconds, or null
 * when the header is absent or unparseable (the caller then uses backoff).
 *
 * Only the two RFC 7231 shapes are accepted. `Date.parse` is happy to turn
 * junk such as `-5` into a date, which would silently become "retry after 0 ms"
 * and hammer a backend that is already asking us to slow down.
 */
export function parseRetryAfter(value: string | null | undefined, now: number): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  // IMF-fixdate always opens with a weekday name; obs-date forms are rejected
  // rather than guessed at, so an unknown shape falls back to backoff.
  if (!/^[A-Za-z]{3},/.test(trimmed)) return null;
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - now);
}

/**
 * Delay before retry number `retryNumber` (1 = after the first failure).
 * Exponential base with equal jitter; a server-supplied `Retry-After` wins
 * outright, clamped to `MAX_HONOURED_RETRY_AFTER_MS`.
 */
export function backoffDelayMs(
  retryNumber: number,
  options: { retryAfterMs?: number | null; random?: () => number },
): number {
  const retryAfter = options.retryAfterMs;
  if (typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter, MAX_HONOURED_RETRY_AFTER_MS);
  }
  const random = options.random ?? Math.random;
  const exponential = Math.min(BASE_BACKOFF_MS * 2 ** Math.max(0, retryNumber - 1), MAX_BACKOFF_MS);
  // Equal jitter: half the window is fixed so backoff still grows, half random
  // so concurrent operators do not all retry on the same tick.
  const jittered = exponential / 2 + random() * (exponential / 2);
  return Math.round(Math.min(jittered, MAX_BACKOFF_MS));
}

/**
 * Upload vs AI vs default. An explicit `kind` always wins; otherwise a multipart
 * body is an upload and an AI path marker is an AI call.
 */
export function classifyRequestKind(
  url: string,
  options: { headers?: HeadersInit; body?: unknown; method?: string } = {},
): RequestKind {
  const contentType = (readHeader(options.headers, 'content-type') || '').toLowerCase();
  const isMultipart = contentType.includes('multipart/form-data');
  const isFormData =
    typeof FormData !== 'undefined' && typeof options.body === 'object' && options.body instanceof FormData;
  if (isMultipart || isFormData) return 'upload';
  if (AI_PATH_MARKERS.some((marker) => url.includes(marker))) return 'ai';
  return 'default';
}

export function timeoutForKind(kind: RequestKind): number {
  return TIMEOUTS[kind];
}

/** `navigator.onLine === false` is the only "definitely offline" signal. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}