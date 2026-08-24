import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { httpRequest, HttpRequestConfig, HttpError } from '../../services/HttpClient';
import { CacheTags } from './tags';

/**
 * Custom baseQuery that wraps our centralized HttpClient.
 * This ensures RTK Query uses the exact same interceptors, retry logic, offline queue,
 * and token management as the rest of the application.
 */
const customBaseQuery: BaseQueryFn<
  any,
  unknown,
  { status: number; data: unknown; message?: string }
> = async (args) => {
  try {
    const response = await httpRequest({
      url: args.url,
      method: args.method,
      data: args.body || args.data,
      headers: args.headers,
      timeout: args.timeout,
      baseURL: args.baseUrl || args.baseURL,
      signal: args.signal,
    });

    return { data: response.data };
  } catch (error: any) {
    return {
      error: {
        status: error?.response?.status || error?.status || 500,
        data: error?.response?.data || error?.data || null,
        message: error?.message || 'An unexpected error occurred.',
      },
    };
  }
};


/**
 * Base API for RTK Query.
 * All feature modules will inject their endpoints into this base API dynamically.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: customBaseQuery,
  endpoints: () => ({}), // Endpoints are injected dynamically
  // Global Tags will be provided here for cache invalidation
  tagTypes: Object.values(CacheTags),
});
