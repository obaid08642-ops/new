/**
 * P15.1 — the single HTTP client patient-web uses for everything.
 *
 * One implementation, applied to every call site:
 *
 *   - a deadline on EVERY attempt: 15 s, 60 s for uploads, 45 s for AI
 *     (`policy.requestKind` decides, `policy.TIMEOUTS` holds the numbers);
 *   - retries only for safe methods or an idempotency-keyed request, with
 *     jittered exponential backoff, honouring `Retry-After`;
 *   - the caller's `AbortSignal` is honoured and wired into the attempt, so
 *     closing the screen or unmounting the component cancels the request
 *     instead of leaking it;
 *   - an offline pre-check, so a dead network fails instantly with a clear code
 *     rather than after a timeout;
 *   - every outcome mapped onto the 13.R5 catalog (`errors.ts`).
 *
 * It is a thin, dependency-injected core so the required proofs run in plain
 * node with a fake `fetch`, and so the browser can install it once over
 * `globalThis.fetch` (see `install.ts`) instead of 170 hand-edited call sites.
 */

import {
  IDEMPOTENCY_HEADER,
  REQUEST_KIND_HEADER,
  RETRY_DEFAULTS,
  hasIdempotencyKey,
  isRetryableRequest,
  isRetryableStatus,
  isSafeMethod,
  retryDelayMs,
  timeoutForRequest,
} from "./policy";
import {
  ApiError,
  apiErrorFromStatus,
  networkError,
  offlineError,
  readBodyCode,
  timeoutError,
} from "./errors";

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type ApiFetchOptions = {
  fetchImpl?: FetchLike;
  /** Injected for deterministic backoff assertions. */
  random?: () => number;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  isOffline?: () => boolean;
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  maxRetryAfterMs?: number;
  timeoutMs?: number;
  /** Fired for every settled response — 15.4 uses it to stamp "last updated". */
  onResponse?: (response: Response, attempt: number) => void;
};

function abortReason(signal: AbortSignal): unknown {
  const reason = (signal as { reason?: unknown }).reason;
  if (reason !== undefined) return reason;
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

export const defaultSleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal!));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

type NormalizedRequest = {
  url: string;
  init: RequestInit;
  /** A body that can be sent again on a retry. Streams cannot be. */
  replayable: boolean;
  callerSignal: AbortSignal | undefined;
};

function headerRecord(raw: HeadersInit | undefined): Record<string, string> {
  if (!raw) return {};
  if (raw instanceof Headers) return Object.fromEntries(raw.entries());
  if (Array.isArray(raw)) return Object.fromEntries(raw.map(([key, value]) => [key, value]));
  return { ...(raw as Record<string, string>) };
}

/**
 * Drops the local request-kind hint. Returns the ORIGINAL object untouched when
 * there is nothing to drop, so a call site's `headers` reach `fetch` exactly as
 * they were written — several public-catalog wrappers are tested on that.
 */
function stripKindHeader(raw: HeadersInit | undefined): HeadersInit {
  const record = headerRecord(raw);
  const names = Object.keys(record);
  if (!names.some((name) => name.toLowerCase() === REQUEST_KIND_HEADER)) return raw as HeadersInit;
  const next: Record<string, string> = {};
  for (const [name, value] of Object.entries(record)) {
    if (name.toLowerCase() !== REQUEST_KIND_HEADER) next[name] = value;
  }
  return next;
}

/**
 * Flattens `(string | Request, RequestInit)` into one replayable shape and
 * removes the local `x-nabd-request-kind` hint so it never hits the network.
 */
export async function normalizeFetchInput(input: RequestInfo | URL, init?: RequestInit): Promise<NormalizedRequest> {
  const passthrough: RequestInit = {};
  // `next` is Next.js' own RequestInit extension (ISR / revalidate). It must
  // survive the wrapper or every cached page silently becomes dynamic.
  for (const key of ["cache", "credentials", "mode", "redirect", "referrer", "referrerPolicy", "integrity", "keepalive", "window", "next"] as const) {
    const value = (init as Record<string, unknown> | undefined)?.[key];
    if (value !== undefined) (passthrough as Record<string, unknown>)[key] = value;
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    const method = input.method.toUpperCase();
    let body: BodyInit | null = null;
    let replayable = true;
    // Buffer a Request body once so retries can resend it. A body that has
    // already been consumed cannot be replayed, so retries are then refused.
    if (method !== "GET" && method !== "HEAD" && input.body !== null) {
      try {
        body = input.bodyUsed ? null : await input.clone().arrayBuffer();
      } catch {
        replayable = false;
      }
    }
    return {
      url: input.url,
      init: { ...passthrough, method, headers: stripKindHeader(input.headers), body },
      replayable,
      callerSignal: init?.signal ?? undefined,
    };
  }

  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input);
  const body = init?.body ?? null;
  const replayable = !isReadableStream(body);

  return {
    url,
    init: {
      ...passthrough,
      method: (init?.method ?? "GET").toUpperCase(),
      headers: stripKindHeader(init?.headers),
      body,
    },
    replayable,
    callerSignal: init?.signal ?? undefined,
  };
}

function isReadableStream(body: unknown): boolean {
  return (
    typeof ReadableStream !== "undefined" &&
    body instanceof ReadableStream
  );
}

/** Never leave a discarded failed response's body open. */
function discardBody(response: Response): void {
  try {
    void response.body?.cancel();
  } catch {
    /* nothing to release */
  }
}

async function readErrorBody(response: Response): Promise<{ code?: string; message?: string }> {
  try {
    const payload = await response.clone().json();
    const message = typeof (payload as { message?: unknown })?.message === "string"
      ? ((payload as { message: string }).message).slice(0, 160)
      : undefined;
    return { code: readBodyCode(payload), message };
  } catch {
    return {};
  }
}

/**
 * The one client. Throws an `ApiError` (already catalog-mapped) on failure, or
 * rethrows the caller's own abort reason when they cancelled.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ApiFetchOptions = {},
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? ((url, requestInit) => fetch(url, requestInit));
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? defaultSleep;
  const isOffline = options.isOffline ?? (() => false);
  const maxRetries = options.retries ?? RETRY_DEFAULTS.retries;
  const retryable = isRetryableRequest(init);
  const deadline = timeoutForRequest(
    typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
    init,
    options.timeoutMs,
  );

  if (isOffline()) throw offlineError();

  const request = await normalizeFetchInput(input, init);
  // A body that cannot be replayed makes every retry a duplicate write of unknown
  // state, so such a request gets exactly one attempt.
  const attempts = retryable && request.replayable ? maxRetries + 1 : 1;

  let lastError: ApiError | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (request.callerSignal?.aborted) throw abortReason(request.callerSignal);

    const controller = new AbortController();
    let timedOut = false;
    const onCallerAbort = () => controller.abort(abortReason(request.callerSignal!));
    if (request.callerSignal) {
      if (request.callerSignal.aborted) throw abortReason(request.callerSignal);
      request.callerSignal.addEventListener("abort", onCallerAbort, { once: true });
    }
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, deadline);

    let response: Response | undefined;
    let failure: ApiError | undefined;
    try {
      response = await fetchImpl(request.url, { ...request.init, signal: controller.signal });
    } catch (cause) {
      if (request.callerSignal?.aborted) throw abortReason(request.callerSignal);
      failure = timedOut ? timeoutError(cause) : networkError(cause);
    } finally {
      clearTimeout(timer);
      request.callerSignal?.removeEventListener("abort", onCallerAbort);
    }

    if (response) {
      options.onResponse?.(response, attempt);
      if (response.ok) return response;

      const retryableStatus = isRetryableStatus(response.status);
      const isLast = attempt === attempts - 1;
      if (!retryableStatus || !retryable || isLast) {
        if (!isLast && retryableStatus && retryable) discardBody(response);
        const body = await readErrorBody(response);
        discardBody(response);
        throw apiErrorFromStatus(response.status, body.code, body.message);
      }

      const delay = retryDelayMs(attempt, {
        retryAfter: response.headers.get("retry-after"),
        nowMs: now(),
        maxRetryAfterMs: options.maxRetryAfterMs,
        baseMs: options.baseMs,
        maxMs: options.maxMs,
        random: options.random,
      });
      discardBody(response);
      if (delay > 0) {
        try {
          await sleep(delay, request.callerSignal);
        } catch (cause) {
          if (request.callerSignal?.aborted) throw abortReason(request.callerSignal);
          throw cause;
        }
      }
      continue;
    }

    lastError = failure;
    const isLast = attempt === attempts - 1;
    if (!retryable || isLast) break;

    const delay = retryDelayMs(attempt, {
      nowMs: now(),
      maxRetryAfterMs: options.maxRetryAfterMs,
      baseMs: options.baseMs,
      maxMs: options.maxMs,
      random: options.random,
    });
    if (delay > 0) {
      try {
        await sleep(delay, request.callerSignal);
      } catch (cause) {
        if (request.callerSignal?.aborted) throw abortReason(request.callerSignal);
        throw cause;
      }
    }
  }

  throw lastError ?? networkError();
}

export { ApiError, IDEMPOTENCY_HEADER, hasIdempotencyKey, isRetryableRequest, isSafeMethod };
