import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { config } from '../core/config';
import { DEFAULT_TIMEOUT_MS, MAX_RETRIES, planRetries, retryAfterTooLong, retryDelayMs, shouldRetryStatus, timeoutFor } from '../utils/requestPolicy';

// Issue 410: the same base URL as the fetch client (ConfigManager's single rule), never a second resolution here.
export const RESOLVED_BASE_URL = config.apiBaseUrl;

export const HttpClient = axios.create({
  baseURL: RESOLVED_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
});

// 15.1: the same timeouts as apiFetch (15 s; 60 s for an upload; 45 s for the AI routes) unless the caller set one.
HttpClient.interceptors.request.use((request) => {
  if (request.timeout === undefined || request.timeout === DEFAULT_TIMEOUT_MS) {
    request.timeout = timeoutFor(String(request.url || ''), request.data);
  }
  return request;
});

export class OfflineMutationPendingError extends Error {
  constructor() { super('offline_mutation_pending_contract'); }
}

// The same retry rules as apiFetch (utils/requestPolicy): a safe read, or a write that carries the caller's own
// idempotency key, is tried again on a timeout, a lost connection or 502/503/504; 429 is tried again for every request.
// The wait honours `Retry-After`, else backs off exponentially with jitter. A write without a key is never replayed.
HttpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
    if (!config) return Promise.reject(error);

    config._retryCount = config._retryCount || 0;
    const method = String(config.method || 'get').toLowerCase();
    const isSafeRead = method === 'get' || method === 'head';
    const headers = config.headers as unknown as { get?: (name: string) => unknown } | undefined;
    const callerSuppliedKey = !!headers?.get?.('Idempotency-Key');
    const plan = planRetries(method, callerSuppliedKey);
    const retryAfter = error.response?.headers?.['retry-after'] as string | undefined;
    const cancelled = axios.isCancel(error);
    const status = error.response?.status;
    const retryable = !cancelled && (status === undefined ? plan.retryTransport : shouldRetryStatus(status, plan));

    if (retryable && config._retryCount < MAX_RETRIES && !retryAfterTooLong(retryAfter)) {
      const attempt = config._retryCount;
      config._retryCount += 1;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt, retryAfter)));
      return HttpClient(config);
    }
    if (!error.response && error.request && !isSafeRead && !cancelled) {
      return Promise.reject(new OfflineMutationPendingError());
    }
    return Promise.reject(error);
  }
);

// Legacy exports for compatibility
export const http = HttpClient;
export const httpRequest = HttpClient;
export const apiFetch = HttpClient;
export const fetchPaginated = HttpClient;
export const enqueueOfflineRequest = async () => { throw new OfflineMutationPendingError(); };
export const getOfflineQueue = async () => [];
export const flushOfflineQueue = async () => [];
export const addInterceptor = () => {};
export class HttpError extends Error {
  status?: number;
  data?: any;
}
export const BASE_URL = RESOLVED_BASE_URL;
export const FASTAPI_BASE_URL = process.env.EXPO_PUBLIC_AI_URL ?? 'https://ai.nabdahplus.com';
export const CDN_URL = process.env.EXPO_PUBLIC_CDN_URL ?? 'https://cdn.nabdahplus.com';

export interface HttpRequestConfig extends InternalAxiosRequestConfig {}
export interface HttpResponse<T = any> { data: T; status: number; }
export interface PaginatedResponse<T> { items: T[]; total: number; data?: T[]; }
export interface HttpInterceptor {
  onRequest?: (config: any) => any;
  onResponse?: (response: any) => any;
  onError?: (error: any) => any;
}
