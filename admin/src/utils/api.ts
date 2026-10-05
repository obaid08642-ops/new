import { AdminApiError, httpRequest, isAdminApiError } from '@/lib/http/client';
import { catalogCodeFromPayload, type SupportedLocale } from '@/lib/http/error-catalog';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function csrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie.split('; ').find((item) => item.startsWith('admin_csrf='));
  return entry ? decodeURIComponent(entry.slice('admin_csrf='.length)) : null;
}

function toBffUrl(url: string) {
  if (url.startsWith('/api/admin/')) return url;
  if (url.startsWith('/')) {
    if (url.startsWith('/api/v1/admin/')) return `/api/admin/${url.slice('/api/v1/admin/'.length)}`;
    if (url.startsWith('/admin/')) return `/api/admin/${url.slice('/admin/'.length)}`;
    if (url.startsWith('/api/')) return url;
    return `/api/admin${url}`;
  }

  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/api\/v1\/admin\/(.*)$/);
    if (match) return `/api/admin/${match[1]}${parsed.search}`;
  } catch {
    // A relative URL that did not parse remains unchanged below.
  }
  return url;
}

/** The admin UI is Arabic-first; `NEXT_PUBLIC_ADMIN_LOCALE=en` switches it. */
function locale(): SupportedLocale {
  return process.env.NEXT_PUBLIC_ADMIN_LOCALE === 'en' ? 'en' : 'ar';
}

export interface GuardedFetchOptions extends RequestInit {
  locale?: SupportedLocale;
  /** Override the upload/AI/default timeout budget instead of auto-detecting. */
  kind?: 'default' | 'upload' | 'ai';
}

/**
 * 15.1 — the compatibility helper for pre-existing pages. It deliberately does
 * not read, persist, or append browser-held bearer tokens: the BFF uses HttpOnly
 * cookies. Timeout, safe retry, abort and offline detection come from
 * `@/lib/http/client`, so all ~220 call sites inherit them unchanged.
 */
export const fetchWithAdminGuard = async (url: string, options: GuardedFetchOptions = {}) => {
  const { locale: localeOverride, kind, ...init } = options;
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  // R6-6: FormData (CSV upload) carries its own multipart boundary — never override it.
  if (!headers.has('Content-Type') && init.body && typeof FormData !== 'undefined' && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (WRITE_METHODS.has(method)) {
    const csrf = csrfToken();
    if (!csrf) throw new AdminApiError({ status: 403, payload: { code: 'csrf_validation_failed' }, code: 'INSUFFICIENT_PERMISSION', locale: localeOverride ?? locale() });
    headers.set('x-admin-csrf', csrf);
  }

  const response = await httpRequest(toBffUrl(url), {
    ...init,
    method,
    headers,
    kind,
    locale: localeOverride ?? locale(),
    credentials: 'same-origin',
    // R7-1: admin lists must never render a cached GET after a mutation.
    cache: 'no-store',
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.assign(`/login?returnTo=${returnTo}`);
  }
  return response;
};

export const apiFetch = async <T = any>(endpoint: string, options: GuardedFetchOptions = {}): Promise<T> => {
  // Goes through `fetchWithAdminGuard` so the 401 → /login redirect, the CSRF
  // header, the BFF path mapping and the 15.1 request policy all still apply.
  const response = await fetchWithAdminGuard(endpoint, options);
  const contentType = response.headers.get('content-type') || '';
  const payload: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const activeLocale = options.locale ?? locale();
    const body = payload as { message?: unknown } | null;
    const serverMessage =
      typeof body?.message === 'string' && body.message
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.filter((item): item is string => typeof item === 'string').join('، ') || undefined
          : undefined;
    throw new AdminApiError({
      status: response.status,
      payload,
      locale: activeLocale,
      code: catalogCodeFromPayload(payload, response.status),
      serverMessage,
    });
  }
  return payload as T;
};

export { isAdminApiError };