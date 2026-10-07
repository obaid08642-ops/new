/**
 * 15.1 — server side of the admin's one HTTP client.
 *
 * The BFF is the only thing that may talk to the backend with the gate secret,
 * so this module is deliberately the only place in the app that knows how to
 * build an upstream call. Every `/api/admin/*` route goes through it, which is
 * what gives the timeout, the safe-retry rule and the abort a single definition.
 *
 * Retry safety on the server is the sharp edge the plan warns about: a timed-out
 * admin write must not be replayed into a duplicate, so an unsafe method is
 * retried only when the *browser* supplied an `idempotency-key` that the backend
 * deduplicates on. The BFF's own minted key (below, and in `[...path].ts`) is
 * deliberately not treated as proof of replayability.
 */
import { httpRequest, isAdminApiError, type AdminApiError } from './client';
import { IDEMPOTENCY_HEADER } from './policy';
import type { RequestKind } from './policy';

export interface UpstreamRequestOptions {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  signal?: AbortSignal | null;
  kind?: RequestKind;
  redirect?: RequestRedirect;
  /**
   * Replayability decided by the caller. `true` only for a safe method or a
   * caller-supplied idempotency key; never set it to make a write "reliable".
   */
  idempotent?: boolean;
  locale?: 'ar' | 'en';
}

/** `ADMIN_BACKEND_URL` is required; there is no default upstream. */
export function backendBase(): string {
  const value = process.env.ADMIN_BACKEND_URL;
  if (!value) throw new Error('ADMIN_BACKEND_URL is required');
  return value.replace(/\/$/, '');
}

/** The browser's key, or null. A minted key must not be passed here. */
export function callerIdempotencyKey(headers: HeadersInit | Record<string, string | string[] | undefined> | undefined): string | null {
  if (!headers) return null;
  if (headers instanceof Headers) return nonEmpty(headers.get(IDEMPOTENCY_HEADER));
  if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === IDEMPOTENCY_HEADER);
    return nonEmpty(found ? found[1] : null);
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const key = Object.keys(record).find((k) => k.toLowerCase() === IDEMPOTENCY_HEADER);
  const value = key ? record[key] : undefined;
  return nonEmpty(Array.isArray(value) ? value[0] : (value as string | undefined));
}

function nonEmpty(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function isReplayable(method: string | undefined, callerKey: string | null): boolean {
  const upper = (method || 'GET').toUpperCase();
  return upper === 'GET' || upper === 'HEAD' || upper === 'OPTIONS' || callerKey !== null;
}

/**
 * A transport failure the BFF should report as "backend unreachable" (502)
 * rather than as whatever the browser client would say.
 */
export function isUpstreamTransportFailure(error: unknown): error is AdminApiError {
  return isAdminApiError(error) && error.isTransportFailure;
}

export async function upstreamRequest(path: string, options: UpstreamRequestOptions = {}): Promise<Response> {
  return httpRequest(`${backendBase()}${path}`, {
    method: options.method,
    headers: options.headers,
    body: options.body,
    signal: options.signal,
    kind: options.kind,
    redirect: options.redirect ?? 'manual',
    idempotent: options.idempotent,
    locale: options.locale ?? 'en',
  });
}