import { httpJson, httpRequest, isAdminApiError, AdminApiError } from './http/client';
import type { SupportedLocale } from './http/error-catalog';

export interface AdminSession {
  user: {
    id: string;
    full_name?: string;
    email?: string;
  };
  permissions: string[];
  impersonator?: { id: string; full_name?: string } | null;
}

export { AdminApiError, isAdminApiError };
export type { SupportedLocale as AdminLocale };

const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function csrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const item = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('admin_csrf='));
  return item ? decodeURIComponent(item.slice('admin_csrf='.length)) : null;
}

function bffPath(path: string): string {
  if (path.startsWith('/api/admin/')) return path;
  if (path.startsWith('/')) return `/api/admin${path}`;
  return `/api/admin/${path}`;
}

/** The admin UI is Arabic-first; `NEXT_PUBLIC_ADMIN_LOCALE=en` switches it. */
function locale(): SupportedLocale {
  return process.env.NEXT_PUBLIC_ADMIN_LOCALE === 'en' ? 'en' : 'ar';
}

export interface AdminFetchOptions extends RequestInit {
  locale?: SupportedLocale;
  /** Override the upload/AI/default timeout budget instead of auto-detecting. */
  kind?: 'default' | 'upload' | 'ai';
}

/**
 * 15.1 — every admin page reaches the backend through here. The timeout,
 * safe-retry, abort and catalogue mapping live in `./http/client`, so all call
 * sites inherit the policy without changing a single one of them.
 */
export async function adminFetch<T>(path: string, options: AdminFetchOptions = {}): Promise<T> {
  const { locale: localeOverride, kind, ...init } = options;
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (writeMethods.has(method)) {
    const token = csrfToken();
    if (!token) {
      throw new AdminApiError({
        status: 403,
        payload: { code: 'missing_csrf_token' },
        code: 'INSUFFICIENT_PERMISSION',
        locale: localeOverride ?? locale(),
      });
    }
    headers.set('x-admin-csrf', token);
  }

  return httpJson<T>(bffPath(path), {
    ...init,
    method,
    headers,
    kind,
    locale: localeOverride ?? locale(),
    credentials: 'same-origin',
  });
}

export function adminMutation<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
) {
  return adminFetch<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Raw-response variant for call sites that need the status or headers. */
export async function adminRequest(path: string, options: AdminFetchOptions = {}): Promise<Response> {
  const { locale: localeOverride, kind, ...init } = options;
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (writeMethods.has(method)) {
    const token = csrfToken();
    if (!token) {
      throw new AdminApiError({
        status: 403,
        payload: { code: 'missing_csrf_token' },
        code: 'INSUFFICIENT_PERMISSION',
        locale: localeOverride ?? locale(),
      });
    }
    headers.set('x-admin-csrf', token);
  }

  return httpRequest(bffPath(path), {
    ...init,
    method,
    headers,
    kind,
    locale: localeOverride ?? locale(),
    credentials: 'same-origin',
  });
}

export function apiErrorMessage(error: unknown, fallback = 'تعذر تنفيذ الطلب. حاول لاحقاً.') {
  if (isAdminApiError(error)) {
    const payload = error.payload as { message?: string | string[]; error?: string } | null;
    if (Array.isArray(payload?.message)) return payload.message.join('، ');
    if (typeof payload?.message === 'string') return payload.message;
    if (typeof payload?.error === 'string') return payload.error;
    if (error.status === 401) return 'انتهت جلسة الإدارة. سجّل الدخول مرة أخرى.';
    if (error.status === 403) return 'ليس لديك الإذن اللازم لتنفيذ هذه العملية.';
    // 15.1: a transport failure has no server message — the catalogue text and
    // its next step are what the operator gets.
    if (error.isTransportFailure) return `${error.catalogMessage} ${error.nextStep}`;
  }
  return fallback;
}

export function toQuery(params: Record<string, string | number | undefined | null>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}