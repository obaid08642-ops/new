/**
 * P15.1 — the ONE transport policy patient-web applies to every HTTP call.
 *
 * Pure functions only: no `fetch`, no timers, no `navigator`. Everything here is
 * unit-tested directly, which is the only way the three required proofs (the
 * timeout fires, a retry honours `Retry-After`, a non-idempotent POST is never
 * retried) can be asserted without a live server.
 *
 * The values are the contract from the Phase 15 plan: 15 s by default, 60 s for
 * uploads, 45 s for AI.
 */

export const IDEMPOTENCY_HEADER = "idempotency-key";

/**
 * Escape hatch for a caller that knows its own cost class. It is consumed here
 * and STRIPPED from the headers that go on the wire, so it is a local hint and
 * never a wire contract. Everything else is inferred from the request itself.
 */
export const REQUEST_KIND_HEADER = "x-nabd-request-kind";

export type RequestKind = "default" | "upload" | "ai";

export const TIMEOUTS: Record<RequestKind, number> = {
  default: 15_000,
  upload: 60_000,
  ai: 45_000,
};

/** RFC 9110 safe methods: read-only, so a retry cannot change server state. */
export const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"] as const;

/** Transient server/network statuses. 4xx other than these are user errors. */
export const RETRY_STATUSES = [408, 425, 429, 500, 502, 503, 504] as const;

export const RETRY_DEFAULTS = {
  /** Two retries means three attempts total — enough to ride out one blip. */
  retries: 2,
  baseMs: 250,
  maxMs: 4_000,
  /** `Retry-After` is honoured but never allowed to park a screen for minutes. */
  maxRetryAfterMs: 30_000,
} as const;

/** Paths that cost real money or real model time upstream. */
const AI_PATH = /(^|\/)(ai|chat|voice|assistant|triage|transcribe)(\/|\?|$)/i;

export function normalizeMethod(method: string | undefined): string {
  return (method || "GET").toUpperCase();
}

/** `RequestInit.headers` is a union, and `new Headers()` throws on a bad value. */
export function readHeader(init: RequestInit | undefined, name: string): string | undefined {
  const raw = init?.headers;
  if (!raw) return undefined;
  let found: string | null = null;
  if (raw instanceof Headers) found = raw.get(name);
  else if (Array.isArray(raw)) {
    const hit = raw.find(([key]) => String(key).toLowerCase() === name);
    found = hit ? hit[1] : null;
  } else {
    for (const [key, value] of Object.entries(raw as Record<string, string>)) {
      if (key.toLowerCase() === name) {
        found = Array.isArray(value) ? String(value[0]) : String(value);
        break;
      }
    }
  }
  const trimmed = found?.trim();
  return trimmed ? trimmed : undefined;
}

function isFormDataBody(body: BodyInit | null | undefined): boolean {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

/**
 * A base64 photo of a prescription inside a JSON envelope is megabytes on the
 * wire, exactly like a multipart upload — and on a weak network 15 s is not a
 * deadline, it is a guaranteed failure. Anything over this size uploads.
 */
export const LARGE_BODY_BYTES = 1_000_000;

function bodyByteLength(body: BodyInit | null | undefined): number | null {
  if (typeof body === "string") return body.length;
  if (body instanceof URLSearchParams) return body.toString().length;
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) return body.byteLength;
  if (typeof Blob !== "undefined" && body instanceof Blob) return body.size;
  return null;
}

/**
 * The cost class of a request. Order matters: an explicit declaration wins, then
 * the body/content-type (an upload is the expensive case), then the path.
 */
export function requestKind(url: string, init?: RequestInit): RequestKind {
  const declared = readHeader(init, REQUEST_KIND_HEADER)?.toLowerCase();
  if (declared === "upload" || declared === "ai") return declared;

  const contentType = readHeader(init, "content-type")?.toLowerCase() ?? "";
  if (isFormDataBody(init?.body)) return "upload";
  if (contentType.startsWith("multipart/form-data") || contentType.startsWith("application/octet-stream")) return "upload";
  // P15.4: single-shot base64 uploads (prescription photos as JSON) get the
  // upload deadline too, so they do not time out on the networks that need
  // them most.
  const bodyLength = bodyByteLength(init?.body);
  if (bodyLength !== null && bodyLength >= LARGE_BODY_BYTES) return "upload";

  return AI_PATH.test(url) ? "ai" : "default";
}

/** The deadline for one attempt of this request. */
export function timeoutForRequest(url: string, init?: RequestInit, overrideMs?: number): number {
  if (typeof overrideMs === "number" && Number.isFinite(overrideMs) && overrideMs > 0) return overrideMs;
  return TIMEOUTS[requestKind(url, init)];
}

export function isSafeMethod(method: string | undefined): boolean {
  return (SAFE_METHODS as readonly string[]).includes(normalizeMethod(method));
}

export function hasIdempotencyKey(init?: RequestInit): boolean {
  return Boolean(readHeader(init, IDEMPOTENCY_HEADER));
}

/**
 * Phase 15.1, verbatim: retries only for safe requests or requests carrying an
 * idempotency key. A POST without one must never be replayed — the backend has
 * no de-duplication to protect it, so a retry can double-charge or double-book.
 */
export function isRetryableRequest(init?: RequestInit): boolean {
  return isSafeMethod(init?.method) || hasIdempotencyKey(init);
}

export function isRetryableStatus(status: number): boolean {
  return (RETRY_STATUSES as readonly number[]).includes(status);
}

/**
 * `Retry-After` is either delay-seconds or an HTTP-date (RFC 9110 §10.2.3).
 * Returns undefined for anything unparseable so the caller falls back to backoff.
 */
export function parseRetryAfterMs(value: string | null | undefined, nowMs: number): number | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const seconds = Number(raw);
    return Number.isFinite(seconds) ? Math.max(0, Math.round(seconds * 1000)) : undefined;
  }
  const at = Date.parse(raw);
  if (Number.isNaN(at)) return undefined;
  return Math.max(0, at - nowMs);
}

/**
 * Exponential backoff with FULL jitter: `random() * min(max, base * 2^attempt)`.
 * Full jitter is what keeps a thousand clients from retrying in lockstep after a
 * shared blip, which fixed-window or equal-jitter backoff still does.
 */
export function backoffDelayMs(
  attempt: number,
  options: { baseMs?: number; maxMs?: number; random?: () => number } = {},
): number {
  const baseMs = options.baseMs ?? RETRY_DEFAULTS.baseMs;
  const maxMs = options.maxMs ?? RETRY_DEFAULTS.maxMs;
  const random = options.random ?? Math.random;
  const exponential = baseMs * Math.pow(2, Math.max(0, attempt));
  const cap = Math.min(maxMs, exponential);
  // Clamped, so a `random()` of exactly 1 (or a misbehaving injected source)
  // can never push a wait past the declared cap.
  return Math.min(cap, Math.floor(random() * (cap + 1)));
}

/**
 * The wait before the next attempt: the server's `Retry-After` when it sent one,
 * otherwise jittered exponential backoff. `Retry-After` is a floor the server
 * insists on, so it replaces the backoff rather than adding to it.
 */
export function retryDelayMs(
  attempt: number,
  context: {
    retryAfter?: string | null;
    nowMs: number;
    maxRetryAfterMs?: number;
    baseMs?: number;
    maxMs?: number;
    random?: () => number;
  },
): number {
  const maxRetryAfterMs = context.maxRetryAfterMs ?? RETRY_DEFAULTS.maxRetryAfterMs;
  const honoured = parseRetryAfterMs(context.retryAfter, context.nowMs);
  if (honoured !== undefined) return Math.min(honoured, maxRetryAfterMs);
  return backoffDelayMs(attempt, context);
}
