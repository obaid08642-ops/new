/**
 * 15.1 — an axios adapter backed by the single fetch-based client.
 *
 * This is what makes "one API client per app" true without rewriting the RTK
 * Query layer or the six modules that already hold the axios instance. Every
 * axios call in the app (`baseApi`, `HttpRemoteDataSource`, push registration,
 * AI assistant, chat room) is executed by `./client`, so all of them inherit the
 * same timeout, retry, cancellation, offline-detection and catalogue policy as
 * the ~170 screens that call `apiFetch` directly.
 *
 * The adapter is responsible only for translating shapes:
 *   request : `InternalAxiosRequestConfig` → `HttpRequestOptions`
 *   success : `HttpResponse`               → `AxiosResponse`
 *   failure : `ApiError`                   → `AxiosError` carrying `response`
 * so the existing `HttpClient` interceptors (and the tests that reach into them)
 * keep working unchanged.
 */
import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { httpRequest } from './client';
import { ApiError, toApiError } from './errors';
import { isSafeMethod } from './policy';

type Query = Record<string, unknown> | string | undefined;

function appendQuery(url: string, params: Query): string {
  if (!params) return url;
  const pairs: string[] = [];
  if (typeof params === 'string') {
    pairs.push(params.startsWith('?') ? params.slice(1) : params);
  } else {
    for (const [key, value] of Object.entries(params)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const entry of value) pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(entry))}`);
      } else {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
  }
  if (!pairs.length) return url;
  return url.includes('?') ? `${url}&${pairs.join('&')}` : `${url}?${pairs.join('&')}`;
}

function headerRecord(config: InternalAxiosRequestConfig): Record<string, string> {
  const out: Record<string, string> = {};
  const headers = config.headers as AxiosHeaders | Record<string, unknown> | undefined;
  if (!headers) return out;
  if (typeof (headers as AxiosHeaders).toJSON === 'function') {
    Object.assign(out, (headers as AxiosHeaders).toJSON() as Record<string, string>);
    return out;
  }
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (value == null) continue;
    out[key] = Array.isArray(value) ? value.map(String).join(', ') : String(value);
  }
  return out;
}

function toAxiosHeaders(record: Record<string, string>): AxiosHeaders {
  const headers = new AxiosHeaders();
  for (const [key, value] of Object.entries(record)) headers.set(key, value);
  return headers;
}

/**
 * axios puts `config.data` in one of several shapes depending on which
 * transform ran. Anything that is not a plain object or string is passed
 * through untouched so FormData/Blob/ArrayBuffer uploads survive.
 */
function requestBody(config: InternalAxiosRequestConfig): unknown {
  const data = config.data;
  if (data == null) return undefined;
  if (typeof data === 'string' || typeof FormData !== 'undefined' && data instanceof FormData) return data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) return data;
  if (ArrayBuffer.isView(data as ArrayBufferView)) return data;
  if (typeof data === 'object') return data;
  return data;
}

export const singleClientAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const url = appendQuery(
    axios.getUri({ ...config, url: config.url, baseURL: config.baseURL } as never),
    config.params as Query,
  );
  const headers = headerRecord(config);
  const callerSuppliedIdempotencyKey = Object.keys(headers).some(
    (key) => key.toLowerCase() === 'idempotency-key' && headers[key],
  );

  const kind = /\/upload|\/media|\/files/i.test(url) ? 'upload' : undefined;

  try {
    const response = await httpRequest({
      url,
      baseUrl: undefined,
      method: config.method,
      headers,
      body: requestBody(config),
      timeoutMs: typeof config.timeout === 'number' && config.timeout > 0 ? config.timeout : undefined,
      kind,
      signal: (config.signal as AbortSignal | undefined) ?? undefined,
      callerSuppliedIdempotencyKey,
      locale: config.headers?.['Accept-Language'] as string | undefined,
    });

    const axiosResponse: AxiosResponse = {
      data: response.data,
      status: response.status,
      statusText: '',
      headers: toAxiosHeaders(response.headers),
      config: config as never,
      request: { __url: url },
    };
    return axiosResponse;
  } catch (error: any) {
    const apiError: ApiError =
      error instanceof ApiError
        ? error
        : toApiError({ status: null, transportFailure: true, originalError: error });

    const axiosError = AxiosError.from(
      apiError.message,
      // `ECONNABORTED` is axios's own code for a timeout; preserve it so existing
      // branches on `error.code === 'ECONNABORTED'` keep working.
      apiError.code === 'TIMEOUT_ERROR' ? 'ECONNABORTED' : 'ERR_NETWORK',
      config as never,
      { __url: url },
      apiError.status != null && apiError.status > 0
        ? {
            data: apiError.toCatalogEnvelope(),
            status: apiError.status,
            statusText: '',
            headers: toAxiosHeaders({}),
            config: config as never,
            request: { __url: url },
          }
        : undefined,
    );
    (axiosError as any).apiError = apiError;
    (axiosError as any).catalogCode = apiError.catalogCode;
    (axiosError as any).nextStep = apiError.nextStep;
    (axiosError as any).userMessage = apiError.userMessage;
    throw axiosError;
  }
};

export { isSafeMethod };
