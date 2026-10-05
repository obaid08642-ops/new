import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { backendCodeToAppError, extractBackendErrorPayload } from './errors';
import { singleClientAdapter } from './http/axiosAdapter';

// M1-ENV: backend URL is now environment-driven (dev/staging/prod) instead of hardcoded.
// Set EXPO_PUBLIC_API_URL in .env — e.g. http://192.168.1.10:8002 for a local backend.
export const RESOLVED_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL
    ? `${process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}/api/v1`
    : 'https://api.nabd.plus/api/v1';

/**
 * 15.1 — this instance is an *adapter*, not a second client.
 *
 * `adapter: singleClientAdapter` routes every call through
 * `./http/client.httpRequest`, the same entry point `apiFetch` uses, so timeouts,
 * retries, `Retry-After`, cancellation and offline detection cannot drift between
 * the axios call sites and the ~170 screens. The timeout below is the axios-level
 * default only; the client applies the 15 s / 60 s / 45 s policy per request kind.
 */
export const HttpClient = axios.create({
  baseURL: RESOLVED_BASE_URL,
  timeout: 15000,
  adapter: singleClientAdapter,
});

export class OfflineMutationPendingError extends Error {
  constructor() { super('offline_mutation_pending_contract'); }
}

/**
 * Retry used to live here. It is gone on purpose: 15.1 gives retry ownership to
 * the single client, which retries safe requests and caller-keyed idempotent ones
 * with backoff + jitter and honours `Retry-After`. What remains here is only the
 * app-level contract that no interceptor can lose: a mutation that never reached
 * the server is *not* replayed, queued, or reported as success — and the 13.R5
 * catalogue envelope is surfaced as an `AppError` so the UI reads the catalogue
 * message plus the next step.
 */
HttpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retryCount?: number }) | undefined;
    if (!config) return Promise.reject(error);

    const method = String(config.method || 'get').toLowerCase();
    const isSafeRead = method === 'get' || method === 'head' || method === 'options';
    const hasIdempotencyKey = Object.keys(config.headers ?? {}).some(
      (key) => key.toLowerCase() === 'idempotency-key',
    );

    if (!error.response && error.request && !isSafeRead && !hasIdempotencyKey) {
      return Promise.reject(new OfflineMutationPendingError());
    }
    // 13.R5: surface backend `{code,message,nextStep}` as AppError so UI reads
    // the catalog message + next step instead of raw Axios payloads.
    const backend = extractBackendErrorPayload(error.response?.data ?? error);
    if (backend) {
      return Promise.reject(
        backendCodeToAppError(backend.code, {
          originalError: error,
          details: backend.details,
          nextStep: backend.nextStep,
        }),
      );
    }
    return Promise.reject(error);
  }
);

// Legacy exports for compatibility
export const http = HttpClient;
export const httpRequest = HttpClient;
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

/** 15.1 — one client. The old alias is kept only so a stale import cannot crash. */
export { apiFetch } from '../utils/api';
