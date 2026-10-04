import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE } from '../constants';
import { buildHeaders, Tokens, Vault, SK, CryptoUtils } from '../security/Security';
import { lookupCatalogError, normalizeCatalogCode, type CatalogCode, type ResolvedCatalogError } from './errorCatalog';
import { isOnline, reportTransportOutcome, setOnline } from './online';

/**
 * P15.1 — the ONE provider-app HTTP client.
 *
 * Everything on this app reaches the network through this module:
 *   - `src/api/client.ts`            (axios instance + interceptors)
 *   - `src/api/errorCatalog.ts`      (catalog code + localized message + next step)
 *   - `src/api/online.ts`            (offline detection)
 *   - `src/utils/api.ts`             (fetch-shaped wrapper)
 *
 * Guarantees:
 *  1. every request has a timeout — 15 s default, 60 s uploads, 45 s AI;
 *  2. retries only for safe methods (GET/HEAD/OPTIONS) or a caller-supplied
 *     idempotency key, with exponential backoff + jitter, honouring `Retry-After`;
 *  3. `config.signal` (AbortSignal) cancels an in-flight request when a screen closes;
 *  4. offline is detected and fails fast with a catalog code;
 *  5. every rejection is a `ProviderApiError` carrying a catalog code, a localized
 *     message and a concrete next step.
 */

// ── 1. Timeouts ────────────────────────────────────────────────────────────
export const TIMEOUTS = {
  /** Default for every ordinary API call. */
  DEFAULT: 15000,
  /** Base64 file upload — large payloads on slow links. */
  UPLOAD: 60000,
  /** AI inference endpoints (copilot, drug-interaction checks). */
  AI: 45000,
} as const;

/**
 * Classify a request from its URL so the right budget applies without every call
 * site having to pass a timeout. `upload` wins over `ai` if a URL matched both.
 */
export function classifyTimeoutKind(url: unknown): keyof typeof TIMEOUTS {
  const raw = typeof url === 'string' ? url : '';
  // Strip the origin/query so a `?q=/storage/upload` search term cannot match.
  const path = raw.replace(/^[a-z]+:\/\/[^/]+/i, '').split('?')[0].split('#')[0];
  if (/(^|\/)storage\//.test(path)) return 'UPLOAD';
  if (/(^|\/)(ai|ml|llm)\//.test(path)) return 'AI';
  return 'DEFAULT';
}

export function timeoutForUrl(url: unknown): number {
  return TIMEOUTS[classifyTimeoutKind(url)];
}

// ── 2. Retry policy ────────────────────────────────────────────────────────
/** Safe/idempotent-by-HTTP-semantics methods. */
export const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;

export const RETRY = {
  /** Total attempts including the first one. */
  maxAttempts: 3,
  /** First backoff step; doubles each attempt. */
  baseDelayMs: 300,
  /** Cap so a long chain never parks the UI for a minute. */
  maxDelayMs: 4000,
  /** Jitter spread as a fraction of the computed delay. */
  jitterRatio: 0.25,
  /** Upper bound on a server-supplied `Retry-After`, so 429 can't park us forever. */
  maxRetryAfterMs: 20000,
  /** Statuses worth a second attempt. */
  statuses: [408, 425, 429, 500, 502, 503, 504] as const,
} as const;

/** Header key used for the caller-supplied idempotency key. */
const IDEMPOTENCY_HEADERS = ['idempotency-key'] as const;

function headerValue(headers: unknown, name: string): string | undefined {
  if (!headers) return undefined;
  const h = headers as Record<string, unknown>;
  const direct = h[name];
  if (typeof direct === 'string' && direct.length > 0) return direct;
  // axios v1 normalizes to an AxiosHeaders instance; fall back to a scan.
  for (const key of Object.keys(h)) {
    if (key.toLowerCase() === name && typeof h[key] === 'string' && (h[key] as string).length > 0) {
      return h[key] as string;
    }
  }
  return undefined;
}

/**
 * Marker the request interceptor sets when *it* (not the caller) generated the
 * idempotency key. A per-request random key satisfies the backend's
 * `@RequireIdempotency` header check but carries NO cross-attempt guarantee, so it
 * must not make a mutation retryable.
 */
export interface RetryEligibilityConfig {
  method?: string;
  headers?: unknown;
  /** Set by the request interceptor for auto-generated keys. */
  __autoIdempotencyKey?: boolean;
}

export function isRetryEligible(config: RetryEligibilityConfig | null | undefined): boolean {
  if (!config) return false;
  const method = String(config.method || 'get').toUpperCase();
  if ((SAFE_METHODS as readonly string[]).includes(method)) return true;
  if (config.__autoIdempotencyKey) return false;
  for (const name of IDEMPOTENCY_HEADERS) {
    if (headerValue(config.headers, name)) return true;
  }
  return false;
}

/**
 * Delay before the next attempt: exponential backoff with full jitter, unless the
 * server sent `Retry-After` (seconds or HTTP-date), which wins.
 *
 * `rand` is injectable so the backoff is deterministic under test.
 */
export function computeRetryDelay(
  attempt: number,
  retryAfter: string | undefined,
  rand: () => number = Math.random,
): number {
  const server = parseRetryAfter(retryAfter);
  if (server !== null) return Math.min(server, RETRY.maxRetryAfterMs);
  const exponential = RETRY.baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const capped = Math.min(exponential, RETRY.maxDelayMs);
  const jitter = capped * RETRY.jitterRatio;
  return Math.max(0, Math.round(capped - jitter / 2 + rand() * jitter));
}

/** `Retry-After` as delta-seconds or an HTTP-date; null when absent/unparseable. */
export function parseRetryAfter(value: string | undefined, now: number = Date.now()): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - now);
}

// ── 5. Catalog-mapped error ────────────────────────────────────────────────
/**
 * A cancelled request is not a platform fault: it carries the fallback code, but the UI
 * must not present it as an error (the screen is gone). `cancelled` marks that case.
 */
export interface ProviderApiError extends Error {
  code: CatalogCode;
  error_code: CatalogCode;
  /** Localized, from the catalog — never a raw backend string. */
  message: string;
  /** Localized next step: retry / check connection / contact support. */
  nextStep: string;
  /** 'retry' | 'check_connection' | 'contact_support' — what the UI should offer. */
  remedy: 'retry' | 'check_connection' | 'contact_support';
  status?: number;
  locale: string;
  offline: boolean;
  /** True when a safe/idempotent request may simply be re-sent. */
  retryable: boolean;
  /** True when the request was aborted by the caller (screen closed). */
  cancelled: boolean;
  original?: unknown;
}

function remedyFor(resolved: ResolvedCatalogError, offline: boolean, retryable: boolean): ProviderApiError['remedy'] {
  if (offline) return 'check_connection';
  if (resolved.code === 'RATE_LIMITED') return 'retry';
  if (resolved.code === 'AUTHENTICATION_REQUIRED') return 'retry';
  if (resolved.code === 'SERVICE_UNAVAILABLE' || resolved.code === 'PROVIDER_NOT_AVAILABLE') {
    return retryable ? 'retry' : 'contact_support';
  }
  if (resolved.code === 'UNKNOWN_ERROR') return retryable ? 'retry' : 'contact_support';
  if (resolved.code === 'INSUFFICIENT_PERMISSION') return 'contact_support';
  return 'retry';
}

/** Status → catalog code. Every status the backend can return lands in the catalog. */
function codeForStatus(status: number | undefined, backendCode: string | null): CatalogCode {
  if (backendCode) {
    const normalized = normalizeCatalogCode(backendCode);
    if (normalized) {
      const resolved = lookupCatalogError(normalized);
      if (!resolved.fallback) return resolved.code;
    }
  }
  if (status === 401) return 'AUTHENTICATION_REQUIRED';
  if (status === 403) return 'INSUFFICIENT_PERMISSION';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 503) return 'SERVICE_UNAVAILABLE';
  if (status === 400 || status === 422) return 'INVALID_INPUT';
  if (status >= 500) return 'SERVICE_UNAVAILABLE';
  if (status === 402) return 'PAYMENT_REQUIRED';
  if (status === 409) return 'DUPLICATE_TRANSACTION';
  // A status we cannot classify: the catalog fallback, not a guess.
  if (status !== undefined) return 'UNKNOWN_ERROR';
  // No response at all: the service could not be reached.
  return 'SERVICE_UNAVAILABLE';
}

/** axios timeout markers — a timed-out request did not prove the device is offline. */
const TIMEOUT_CODES = ['ECONNABORTED', 'ETIMEDOUT', 'ERR_REQUEST_TIMEOUT'];

function isTimeoutError(err: AxiosError | undefined): boolean {
  if (!err) return false;
  return typeof err.code === 'string' && TIMEOUT_CODES.includes(err.code);
}

/**
 * Backend catalog code carried by a failure payload, looked for on the payload itself
 * and through the axios `response.data` envelope.
 */
function extractBackendCode(input: unknown): string | null {
  if (!input || typeof input !== 'object') return null;
  const rec = input as Record<string, unknown>;
  const read = (o: unknown): string | null => {
    if (!o || typeof o !== 'object') return null;
    const r = o as Record<string, unknown>;
    return normalizeCatalogCode(r.code ?? r.error_code);
  };
  const direct = read(rec);
  if (direct) return direct;
  const response = rec.response;
  if (response && typeof response === 'object') {
    const viaResponse = read((response as Record<string, unknown>).data);
    if (viaResponse) return viaResponse;
  }
  return read(rec.data);
}

/**
 * Raw backend detail preserved on a rejected request.
 *
 * The catalog intentionally does not model every case (an expired OTP, for
 * instance). Screens still need to make a *flow* decision from it — bounce back to
 * the resend step, say — so the raw message/code is reachable without the UI
 * bypassing the single client again.
 */
export function backendDetail(err: unknown): { message?: string; code?: string; status?: number } | null {
  if (!err || typeof err !== 'object') return null;
  const rec = err as Record<string, unknown>;
  const out: { message?: string; code?: string; status?: number } = {};
  // The raw payload wins over the error's own fields: those were already replaced with
  // localized catalog text.
  const original = rec.original;
  if (original && typeof original === 'object') {
    const o = original as Record<string, unknown>;
    const response = o.response as Record<string, unknown> | undefined;
    const data = (response?.data ?? o.data) as Record<string, unknown> | undefined;
    if (data) {
      if (typeof data.message === 'string') out.message = data.message;
      if (typeof data.code === 'string') out.code = data.code;
    }
    if (!out.message && typeof o.message === 'string') out.message = o.message;
    if (!out.code && typeof o.code === 'string') out.code = o.code;
    if (typeof response?.status === 'number') out.status = response.status;
  }
  if (!out.message && typeof rec.message === 'string') out.message = rec.message;
  if (!out.code && typeof rec.code === 'string') out.code = rec.code;
  if (out.status === undefined && typeof rec.status === 'number') out.status = rec.status;
  return Object.keys(out).length ? out : null;
}

export function buildProviderApiError(
  input: unknown,
  opts: {
    status?: number;
    locale?: string;
    offline?: boolean;
    retryable?: boolean;
    cancelled?: boolean;
  } = {},
): ProviderApiError {
  const status = opts.status;
  const offline = opts.offline ?? (isOnline() === false);
  const backendCode = extractBackendCode(input);
  const code = codeForStatus(status, backendCode);
  const resolved = lookupCatalogError(code, opts.locale);
  const retryable = opts.retryable ?? false;
  const err = new Error(resolved.message) as ProviderApiError;
  err.name = 'ProviderApiError';
  err.code = code;
  err.error_code = code;
  err.message = resolved.message;
  err.nextStep = resolved.nextStep;
  err.remedy = opts.cancelled ? 'retry' : remedyFor(resolved, offline, retryable);
  if (status !== undefined) err.status = status;
  err.locale = opts.locale ?? 'en';
  err.offline = offline;
  err.retryable = retryable;
  err.cancelled = opts.cancelled ?? false;
  err.original = input;
  return err;
}

// ── The instance ───────────────────────────────────────────────────────────
export interface ResilientRequestConfig extends AxiosRequestConfig {
  /** Skip the retry interceptor for this one call (e.g. fire-and-forget polling). */
  skipRetry?: boolean;
  /** Force a specific timeout budget instead of URL classification. */
  timeoutKind?: keyof typeof TIMEOUTS;
}

interface AttemptState extends InternalAxiosRequestConfig {
  __attempt?: number;
  skipRetry?: boolean;
  timeoutKind?: keyof typeof TIMEOUTS;
  __autoIdempotencyKey?: boolean;
}

export const client: AxiosInstance = axios.create({
  baseURL: API_BASE,
  // Belt-and-braces default; the request interceptor narrows it per request.
  timeout: TIMEOUTS.DEFAULT,
});

// Request Interceptor: secure headers, idempotency key, per-request timeout.
client.interceptors.request.use(
  async (config) => {
    const cfg = config as AttemptState;
    try {
      if (__DEV__) {
        const customIp = await Vault.get(SK.CUSTOM_API_IP);
        if (customIp) {
          cfg.baseURL = `http://${customIp}:8002/api/v1`;
        }
      }
      const secureHeaders = await buildHeaders(true);
      cfg.headers = {
        ...cfg.headers,
        ...secureHeaders,
      } as any;
      // Routes marked @RequireIdempotency answer 400 idempotency_key_required without a key.
      // A caller needing retry de-duplication sets its own stable key; otherwise one per request.
      const method = String(cfg.method || 'get').toUpperCase();
      const h: any = cfg.headers;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !h['Idempotency-Key'] && !h['idempotency-key']) {
        h['Idempotency-Key'] = `prov-${await CryptoUtils.randomHex(16)}`;
        // Auto-generated: satisfies the header requirement but grants no retry guarantee.
        cfg.__autoIdempotencyKey = true;
      }
      // 1. Timeout on every request. axios merges `client.defaults` into the config
      // before interceptors run, so a raw numeric `config.timeout` cannot be told apart
      // from the instance default — the rule is therefore: `timeoutKind` wins, else the
      // URL decides. Callers override the budget with `timeoutKind`, not with a number.
      if (cfg.timeoutKind) {
        cfg.timeout = TIMEOUTS[cfg.timeoutKind];
      } else {
        cfg.timeout = timeoutForUrl(cfg.url);
      }
    } catch (e) {
      if (__DEV__) console.warn('[API Client Request Interceptor Error]', e);
    }
    return cfg;
  },
  (error) => Promise.reject(error),
);

// Retry Interceptor (P15.1): safe/idempotent only, backoff + jitter, Retry-After.
client.interceptors.response.use(
  (response) => {
    // Any HTTP response proves the server was reachable.
    reportTransportOutcome(true);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = (error.config || {}) as AttemptState;

    // 3. Cancellation: a screen that unmounted aborts its signal. Never retry, never
    // report it as a server fault, and do not poison the shared reachability verdict
    // (quitting an app is not evidence that the network is down).
    if (axios.isCancel?.(error) || originalRequest.signal?.aborted || error.code === 'ERR_CANCELED') {
      return Promise.reject(
        buildProviderApiError(
          { code: 'UNKNOWN_ERROR' },
          { retryable: false, offline: false, cancelled: true },
        ),
      );
    }

    const status = error.response?.status;
    const timedOut = isTimeoutError(error);
    // No HTTP response at all — but a timeout says nothing about reachability.
    const transportFailure = status === undefined && !timedOut;
    // Reachability as it stood *before* this failure, so the first network blip on a
    // connected device is still retried instead of immediately condemning us offline.
    const wasOnline = isOnline();
    if (transportFailure) reportTransportOutcome(false);

    const eligible = isRetryEligible(originalRequest);
    const retriableStatus = status !== undefined && (RETRY.statuses as readonly number[]).includes(status);
    const attempts = originalRequest.__attempt ?? 0;
    const canRetry =
      !originalRequest.skipRetry &&
      eligible &&
      attempts + 1 < RETRY.maxAttempts &&
      (retriableStatus || timedOut || (transportFailure && wasOnline)) &&
      !originalRequest.signal?.aborted;

    if (canRetry) {
      const nextAttempt = attempts + 1;
      const retryAfter = status !== undefined ? headerValue(error.response?.headers, 'retry-after') : undefined;
      const delay = computeRetryDelay(nextAttempt, retryAfter);
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (originalRequest.signal?.aborted) {
        return Promise.reject(
          buildProviderApiError({ code: 'UNKNOWN_ERROR' }, { retryable: false, cancelled: true }),
        );
      }
      originalRequest.__attempt = nextAttempt;
      return client.request(originalRequest);
    }

    // Session expiry: clear tokens once, before mapping.
    if (status === 401 && !originalRequest.__attempt) {
      try {
        await Tokens.clear();
      } catch (e) {
        if (__DEV__) console.warn('[API Client Session Clear Error]', e);
      }
    }

    // 5. Every error mapped to the catalog with message + next step.
    const exhaustedRetries = attempts + 1 >= RETRY.maxAttempts;
    return Promise.reject(
      buildProviderApiError(error.response?.data ?? error, {
        status,
        offline: transportFailure,
        retryable: eligible && (exhaustedRetries || retriableStatus || timedOut),
      }),
    );
  },
);

/** Reset reachability on resume so a stale "offline" never blocks the first request. */
export function primeConnectivity() {
  setOnline(true);
}

export default client;

/** `showBackendError` / `extractToastBackendCode` read these, so keep them. */
export interface NormalizedProviderError {
  code: string;
  error_code: string;
  message: string;
  nextStep?: string;
  details?: Record<string, unknown>;
  status?: number;
  original?: unknown;
}

const CODE_PATTERN = /^[A-Za-z0-9_.-]{1,80}$/;

export function normalizeProviderErrorCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!CODE_PATTERN.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

export function toNormalizedProviderError(input: unknown, status?: number): NormalizedProviderError | null {
  const src = ((): Record<string, unknown> | null => {
    if (!input || typeof input !== 'object') return null;
    const rec = input as Record<string, unknown>;
    // Axios-style error: prefer response.data, fall back to the error itself.
    const data = (rec.response as Record<string, unknown> | undefined)?.data;
    if (data && typeof data === 'object') return data as Record<string, unknown>;
    if (rec.data && typeof rec.data === 'object') return rec.data as Record<string, unknown>;
    return rec;
  })();
  if (!src) return null;
  const rawCode = (src.code ?? src.error_code) as unknown;
  const code = normalizeProviderErrorCode(rawCode);
  if (!code) return null;
  const message = typeof src.message === 'string' && src.message.length > 0 ? src.message : String(rawCode);
  const out: NormalizedProviderError = {
    code,
    error_code: code,
    message,
    status,
    original: input,
  };
  if (typeof src.nextStep === 'string') out.nextStep = src.nextStep;
  if (src.details && typeof src.details === 'object') out.details = src.details as Record<string, unknown>;
  return out;
}