/**
 * apiFetch — thin fetch-style wrapper over the shared axios client.
 * Keeps JWT / secure-header interceptors, returns parsed response data.
 */
import client from '../api/client';

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<any> {
  const method = (options.method || 'GET').toUpperCase() as NonNullable<ApiFetchOptions['method']>;
  const res = await client.request({
    url: path,
    method,
    data: method === 'GET' || method === 'DELETE' ? undefined : options.body,
    params: options.params,
    headers: options.headers,
  });
  return res.data;
}
