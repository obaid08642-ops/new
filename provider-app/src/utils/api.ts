/**
 * P15.1 — `apiFetch`, the fetch-shaped facade over the single HTTP client.
 *
 * Every provider-app call site uses this (or `client` directly) so there is exactly
 * one place that owns timeouts, retries, cancellation and catalog error mapping.
 */
import client, { type ResilientRequestConfig } from '../api/client';

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  /**
   * Stable key making this mutation safe to retry: the server de-duplicates a replay
   * carrying the same key. Omit it and the client will NOT retry the request.
   */
  idempotencyKey?: string;
  /** Force a timeout budget instead of deriving it from the URL. */
  timeoutKind?: 'DEFAULT' | 'UPLOAD' | 'AI';
  /** Cancel the request (pass an AbortController signal tied to screen unmount). */
  signal?: AbortSignal;
  /** Opt out of retries for a one-shot request. */
  skipRetry?: boolean;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<any> {
  const method = (options.method || 'GET').toUpperCase() as NonNullable<ApiFetchOptions['method']>;
  const headers: Record<string, string> = { ...(options.headers || {}) };
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  const config: ResilientRequestConfig = {
    url: path,
    method,
    data: method === 'GET' || method === 'DELETE' ? undefined : options.body,
    params: options.params,
    headers,
  };
  if (options.timeoutKind) config.timeoutKind = options.timeoutKind;
  if (options.signal) config.signal = options.signal;
  if (options.skipRetry) config.skipRetry = true;
  const res = await client.request(config);
  return res.data;
}