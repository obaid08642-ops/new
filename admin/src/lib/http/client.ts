/**
 * 15.1 — the admin's one HTTP client.
 *
 * Every admin network call funnels through `httpRequest`. It is the only place
 * in the app that calls `fetch` for an API, which is what makes the policy
 * (timeout, safe retry, abort, offline, catalogue mapping) apply uniformly to
 * `adminFetch`, `fetchWithAdminGuard` and the BFF's upstream calls instead of
 * being re-implemented page by page.
 *
 * Contract with callers:
 * - resolves with the `Response` for any HTTP status, including 4xx/5xx, with
 *   the body left unread so the existing `res.ok` / `res.json()` call sites
 *   keep working byte for byte;
 * - rejects only for transport failures (offline, timeout, network) and for a
 *   caller-initiated abort, which rethrows as `AbortError` exactly as a bare
 *   `fetch` does today;
 * - every rejection is an `AdminApiError` carrying a catalogue code, a localized
 *   catalogue message and a next step.
 */
import {
  DEFAULT_MAX_ATTEMPTS,
  backoffDelayMs,
  classifyRequestKind,
  isOffline,
  isRetryableStatus,
  isRetrySafe,
  parseRetryAfter,
  timeoutForKind,
  type RequestKind,
} from './policy';
import {
  SUPPORT_NEXT_STEP,
  TIMEOUT_NEXT_STEP,
  TRANSPORT_NEXT_STEP,
  catalogCodeForStatus,
  catalogCodeFromPayload,
  lookupCatalogError,
  type SupportedLocale,
} from './error-catalog';

export type TransportErrorKind = 'offline' | 'timeout' | 'network';

export interface AdminApiErrorInit {
  status: number;
  payload?: unknown;
  kind?: TransportErrorKind;
  code?: string;
  locale?: SupportedLocale;
  /** Message from the server, kept verbatim: operators already read these. */
  serverMessage?: string;
  attempts?: number;
  retryAfterMs?: number | null;
  cause?: unknown;
}

/**
 * The single error type the admin throws for a failed API call. Re-exported
 * under its historical name from `@/lib/admin-client` so existing `instanceof`
 * checks keep working.
 */
export class AdminApiError extends Error {
  readonly status: number;
  readonly payload: unknown;
  readonly kind: TransportErrorKind | 'http';
  readonly code: string;
  /** Catalogue message (localized) — never blank, always paired with a code. */
  readonly catalogMessage: string;
  readonly nextStep: string;
  readonly attempts: number;
  readonly retryAfterMs: number | null;

  constructor(init: AdminApiErrorInit) {
    const locale = init.locale ?? 'ar';
    const code = init.code ?? catalogCodeForStatus(init.status);
    const catalog = lookupCatalogError(code, locale);
    // A transport failure never reached the backend, so it has no server
    // message. Its next step is specific ("check your connection", "try
    // again") while the text stays the catalogue's, so operators see one voice.
    const transportNextStep =
      init.kind === 'offline' || init.kind === 'network'
        ? TRANSPORT_NEXT_STEP[locale]
        : init.kind === 'timeout'
          ? TIMEOUT_NEXT_STEP[locale]
          : null;
    super(init.serverMessage || catalog.message);
    this.name = 'AdminApiError';
    this.status = init.status;
    this.payload = init.payload ?? null;
    this.kind = init.kind ?? 'http';
    this.code = code;
    this.catalogMessage = catalog.message;
    this.nextStep = transportNextStep ?? catalog.nextStep ?? SUPPORT_NEXT_STEP[locale];
    this.attempts = init.attempts ?? 1;
    this.retryAfterMs = init.retryAfterMs ?? null;
    if (init.cause !== undefined) this.cause = init.cause;
  }

  /** True when the failure never reached the backend. */
  get isTransportFailure(): boolean {
    return this.kind !== 'http';
  }
}

export function isAdminApiError(value: unknown): value is AdminApiError {
  return value instanceof AdminApiError;
}

export interface HttpRequestOptions {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  redirect?: RequestRedirect;
  /** Caller's cancellation — route change, screen closed, component unmounted. */
  signal?: AbortSignal | null;
  /** Force a budget instead of classifying from the URL and headers. */
  kind?: RequestKind;
  locale?: SupportedLocale;
  /** `true`/`false` to force the safe-retry decision; otherwise derived. */
  idempotent?: boolean;
  maxAttempts?: number;
  /** Injected for tests and for the Node-side BFF runtime. */
  fetchImpl?: typeof fetch;
  random?: () => number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function abortError(): Error {
  if (typeof DOMException === 'function') return new DOMException('The operation was aborted.', 'AbortError');
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

function isAbort(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError')
  );
}

function serverMessageFrom(payload: unknown): string | undefined {
  const body = payload as { message?: unknown } | null;
  if (Array.isArray(body?.message)) {
    const joined = body.message.filter((item): item is string => typeof item === 'string').join('، ');
    return joined || undefined;
  }
  return typeof body?.message === 'string' && body.message ? body.message : undefined;
}

export async function httpRequest(url: string, options: HttpRequestOptions = {}): Promise<Response> {
  const locale: SupportedLocale = options.locale ?? 'ar';
  const method = (options.method || 'GET').toUpperCase();
  const kind = options.kind ?? classifyRequestKind(url, options);
  const timeoutMs = timeoutForKind(kind);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const retryable = options.idempotent ?? isRetrySafe(method, options.headers);
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);

  if (isOffline()) {
    throw new AdminApiError({ status: 0, kind: 'offline', locale, code: 'SERVICE_UNAVAILABLE' });
  }

  let lastTransportError: { error: unknown; kind: TransportErrorKind } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onExternalAbort = () => controller.abort();
    const externalSignal = options.signal ?? undefined;
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timer);
        throw abortError();
      }
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const response = await fetchImpl(url, {
        method,
        headers: options.headers,
        body: options.body ?? undefined,
        credentials: options.credentials,
        cache: options.cache,
        redirect: options.redirect,
        signal: controller.signal,
      });

      if (!response.ok && retryable && attempt < maxAttempts && isRetryableStatus(response.status)) {
        const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'), now());
        clearTimeout(timer);
        externalSignal?.removeEventListener('abort', onExternalAbort);
        await sleep(backoffDelayMs(attempt, { retryAfterMs, random: options.random }));
        continue;
      }

      return response;
    } catch (error) {
      if (externalSignal?.aborted) {
        // The caller closed the screen or left the route: not a failure to report.
        throw abortError();
      }
      if (isAbort(error) && timedOut) {
        lastTransportError = { error, kind: 'timeout' };
      } else if (isAbort(error)) {
        throw abortError();
      } else {
        lastTransportError = { error, kind: 'network' };
      }
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }

    // Transport failure: retried under the same safe-retry rule as an HTTP 5xx.
    if (!retryable || attempt >= maxAttempts) break;
    await sleep(backoffDelayMs(attempt, { retryAfterMs: null, random: options.random }));
  }

  throw new AdminApiError({
    status: 0,
    kind: lastTransportError?.kind ?? 'network',
    locale,
    code: 'SERVICE_UNAVAILABLE',
    attempts: maxAttempts,
    cause: lastTransportError?.error,
  });
}

/**
 * Typed wrapper used by `adminFetch`/`apiFetch`: reads the body and throws
 * `AdminApiError` for a non-ok status, taking the catalogue code from the body
 * when the backend already sent one (13.R5 global filter → `{ code, message }`).
 */
export async function httpJson<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
  const response = await httpRequest(url, options);
  const contentType = response.headers.get('content-type') || '';
  const payload: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const locale = options.locale ?? 'ar';
    throw new AdminApiError({
      status: response.status,
      payload,
      locale,
      code: catalogCodeFromPayload(payload, response.status),
      serverMessage: serverMessageFrom(payload),
    });
  }
  return payload as T;
}