/**
 * 15.1 — THE patient-app HTTP client. One implementation, one place that owns
 * timeouts, retries, cancellation, offline detection, and catalogue mapping.
 *
 * Every entry point in the app funnels through `httpRequest`:
 *   - `src/utils/api.ts`  → `apiFetch` (the ~170 screens)
 *   - `utils/api.ts`      → legacy re-export shim
 *   - `src/services/HttpClient.ts` → axios adapter over the same core
 *
 * Why fetch and not axios: RN's `XMLHttpRequest` does not implement
 * `AbortSignal.timeout`, cannot distinguish "aborted by the caller's screen
 * closing" from "aborted by our own timeout", and has no `Retry-After`-friendly
 * header access on abort. The axios surface the rest of the app uses is
 * preserved by wrapping this core in an axios *adapter*, so consolidation does
 * not force 170 call-site rewrites.
 */
import {
  DEFAULT_MAX_ATTEMPTS,
  decideRetry,
  parseRetryAfter,
  timeoutForKind,
  type RequestKind,
} from './policy';
import {
  ApiError,
  cancelledError,
  offlineError,
  timeoutError,
  toApiError,
} from './errors';
import type { BackendErrorCode } from './errorCatalog';
import { markTransportFailure, markTransportSuccess } from './connectivity';
import { noteServerDate } from '../time/serverTime';

export interface HttpRequestOptions {
  /** Absolute URL, or a path resolved against `baseUrl`. */
  url: string;
  baseUrl?: string;
  method?: string;
  headers?: Record<string, string> | Headers;
  /** `FormData` / `Blob` / string pass through; a plain object is JSON-encoded. */
  body?: unknown;
  /** Explicit timeout in ms. Overrides `kind`. */
  timeoutMs?: number;
  kind?: RequestKind;
  /**
   * Caller cancellation. Wire this to the screen's lifetime
   * (`useEffect(() => () => controller.abort(), [])`) so navigating away
   * aborts the in-flight request instead of resolving into an unmounted tree.
   */
  signal?: AbortSignal;
  /** 1 = no retry. Defaults to 3 (1 attempt + 2 retries). */
  maxAttempts?: number;
  /**
   * True only when the CALLER supplied the idempotency key. An auto-generated key
   * satisfies `@RequireIdempotency` but does not authorise a replay, so it must
   * not be passed as true.
   */
  callerSuppliedIdempotencyKey?: boolean;
  locale?: string | null;
  /** Injected in tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Injected in tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Injected in tests. */
  random?: () => number;
  /** Injected in tests. */
  now?: () => number;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
  /** Attempts actually made, including the successful one. */
  attempts: number;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function resolveUrl(url: string, baseUrl?: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (!baseUrl) return url;
  return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

function headersToObject(input: HttpRequestOptions['headers']): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input) return out;
  if (typeof (input as Headers).forEach === 'function' && !Array.isArray(input)) {
    (input as Headers).forEach((value, key) => {
      out[key.toLowerCase()] = value;
    });
    return out;
  }
  for (const [key, value] of Object.entries(input as Record<string, string>)) {
    if (value != null) out[key.toLowerCase()] = String(value);
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !(value instanceof FormData) && !(value instanceof Blob) && !ArrayBuffer.isView(value as ArrayBufferView);
}

export function encodeBody(
  body: unknown,
  headers: Record<string, string>,
): { payload: BodyInit | undefined; headers: Record<string, string> } {
  if (body == null) return { payload: undefined, headers };
  if (typeof body === 'string') {
    if (!hasHeader(headers, 'content-type')) headers['content-type'] = 'application/json';
    return { payload: body, headers };
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    // The runtime must set the multipart boundary itself.
    return { payload: body as BodyInit, headers };
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) return { payload: body as BodyInit, headers };
  if (isPlainObject(body)) {
    if (!hasHeader(headers, 'content-type')) headers['content-type'] = 'application/json';
    return { payload: JSON.stringify(body), headers };
  }
  return { payload: body as BodyInit, headers };
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === name);
}

interface AttemptOutcome {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
}

function parseBody(bodyText: string): unknown {
  if (!bodyText.trim()) return null;
  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
}

/**
 * A `Response` always carries `status`, but a Response-shaped object is not
 * guaranteed to: minimal WHATWG shims and test doubles often expose only the
 * `ok` flag, which the spec defines as exactly "status is 200–299". Read both so
 * a response is never mistaken for a failure.
 */
function readStatus(response: { status?: unknown; ok?: unknown }): number {
  if (typeof response.status === 'number' && Number.isFinite(response.status)) return response.status;
  if (typeof response.ok === 'boolean') return response.ok ? 200 : 500;
  return 0;
}

/**
 * One attempt. Resolves for any HTTP status (the caller decides what is fatal)
 * and rejects only for transport-level failures, cancellation, or timeout.
 */
async function attemptFetch(
  options: HttpRequestOptions,
  resolvedUrl: string,
  headers: Record<string, string>,
  payload: BodyInit | undefined,
  fetchImpl: typeof fetch,
): Promise<AttemptOutcome> {
  const timeoutMs = options.timeoutMs ?? timeoutForKind(options.kind);
  const controller = new AbortController();
  const callerSignal = options.signal;

  if (callerSignal?.aborted) throw cancelledError(options.locale, callerSignal.reason);

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onCallerAbort = () => controller.abort();
  callerSignal?.addEventListener('abort', onCallerAbort);

  try {
    const response = await fetchImpl(resolvedUrl, {
      method: String(options.method ?? 'GET').toUpperCase(),
      headers,
      body: payload,
      signal: controller.signal,
    });

    const responseHeaders: Record<string, string> = {};
    response.headers?.forEach?.((value: string, key: string) => {
      responseHeaders[key.toLowerCase()] = value;
    });

    const bodyText = typeof response.text === 'function' ? await response.text() : '';
    return { status: readStatus(response), headers: responseHeaders, bodyText };
  } catch (error: any) {
    if (timedOut) throw timeoutError(timeoutMs, options.locale);
    if (callerSignal?.aborted) throw cancelledError(options.locale, error);
    if (error?.name === 'AbortError') throw cancelledError(options.locale, error);
    throw offlineError(options.locale, error);
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
}

/**
 * Perform an HTTP request with the full 15.1 policy. Resolves the parsed body;
 * rejects with an {@link ApiError} carrying a catalogue message and next step.
 */
export async function httpRequest<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const fetchImpl = options.fetchImpl ?? ((globalThis as any).fetch as typeof fetch);
  if (typeof fetchImpl !== 'function') {
    throw offlineError(options.locale, new Error('fetch is unavailable in this runtime'));
  }

  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? (() => Date.now());
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const resolvedUrl = resolveUrl(options.url, options.baseUrl);
  const { payload, headers: encodedHeaders } = encodeBody(options.body, headersToObject(options.headers));

  let lastError: ApiError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let outcome: AttemptOutcome;
    try {
      outcome = await attemptFetch(options, resolvedUrl, encodedHeaders, payload, fetchImpl);
    } catch (error: any) {
      const apiError =
        error instanceof ApiError
          ? error
          : offlineError(options.locale, error);
      lastError = apiError;

      if (apiError.code === 'OFFLINE_ERROR') markTransportFailure();

      const decision = decideRetry({
        method: options.method,
        attempt,
        maxAttempts,
        callerSuppliedIdempotencyKey: options.callerSuppliedIdempotencyKey === true,
        transportFailure: true,
        cancelled: apiError.code === 'CANCELLED_ERROR' || apiError.code === 'TIMEOUT_ERROR',
        nowMs: now(),
      });
      if (!decision.retry) throw apiError;
      await sleep(decision.delayMs);
      continue;
    }

    markTransportSuccess();
    lastError = null;

    // 15.9 — every settled response re-anchors the server clock, so a wrong
    // device clock stops mattering for slots, reminders and OTP windows. A
    // missing or broken Date header keeps the previous offset (or none).
    try {
      noteServerDate(outcome.headers['date']);
    } catch {
      // A header read must never break the response path.
    }

    const retryAfterHeader = outcome.headers['retry-after'] ?? null;
    const decision = decideRetry({
      method: options.method,
      attempt,
      maxAttempts,
      callerSuppliedIdempotencyKey: options.callerSuppliedIdempotencyKey === true,
      status: outcome.status,
      retryAfterHeader,
      nowMs: now(),
    });

    if (decision.retry) {
      await sleep(decision.delayMs);
      continue;
    }

    const parsed = parseBody(outcome.bodyText);
    if (outcome.status >= 200 && outcome.status < 300) {
      return {
        data: parsed as T,
        status: outcome.status,
        headers: outcome.headers,
        attempts: attempt,
      };
    }

    const envelopeSource =
      parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : { message: parsed };
    throw toApiError({
      status: outcome.status,
      serverMessage: (envelopeSource as any)?.message ?? (envelopeSource as any)?.error ?? parsed,
      serverCode: (envelopeSource as any)?.code ?? (envelopeSource as any)?.error_code,
      serverNextStep: (envelopeSource as any)?.nextStep,
      details: (envelopeSource as any)?.details,
      locale: options.locale,
    });
  }

  /* istanbul ignore next — the loop always returns or throws. */
  throw lastError ?? toApiError({ status: null, transportFailure: true, locale: options.locale });
}

export type { BackendErrorCode };
export { parseRetryAfter };
