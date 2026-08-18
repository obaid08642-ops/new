import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { SyncManager } from './SyncManager';

// M1-ENV: backend URL is now environment-driven (dev/staging/prod) instead of hardcoded.
// Set EXPO_PUBLIC_API_URL in .env — e.g. http://192.168.1.10:8002 for a local backend.
export const RESOLVED_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL
    ? `${process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}/api/v1`
    : 'https://api.nabd.plus/api/v1';

export const HttpClient = axios.create({
  baseURL: RESOLVED_BASE_URL,
  timeout: 15000,
});

// Custom global retry interceptor for 5xx and network errors
HttpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
    if (!config) return Promise.reject(error);

    config._retryCount = config._retryCount || 0;
    const shouldRetry = !error.response || error.response.status >= 500;
    
    if (shouldRetry && config._retryCount < 3) {
      config._retryCount += 1;
      const delay = Math.pow(2, config._retryCount) * 1000;
      
      await new Promise((resolve) => setTimeout(resolve, delay));
      return HttpClient(config);
    }
    // If offline (Network Error), queue the request if it's a mutation (POST, PUT, PATCH, DELETE)
    if (!error.response && error.request) {
      const config = error.config as InternalAxiosRequestConfig;
      if (config && config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
        await SyncManager.enqueueRequest({
          method: config.method,
          url: `${config.baseURL || ''}${config.url || ''}`,
          data: config.data,
          headers: config.headers,
        });
        // Resolve cleanly so UI doesn't crash, instead it acts as "queued"
        return Promise.resolve({ data: { queued: true, message: 'Saved offline. Will sync when online.' } });
      }
    }
    return Promise.reject(error);
  }
);

// Legacy exports for compatibility
export const http = HttpClient;
export const httpRequest = HttpClient;
export const apiFetch = HttpClient;
export const fetchPaginated = HttpClient;
export const enqueueOfflineRequest = async () => {};
export const getOfflineQueue = async () => [];
export const flushOfflineQueue = async () => {};
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
