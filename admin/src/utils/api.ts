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

/**
 * Compatibility helper for pre-existing pages. It deliberately does not read,
 * persist, or append browser-held bearer tokens: the BFF uses HttpOnly cookies.
 */
export const fetchWithAdminGuard = async (url: string, options: RequestInit = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  if (WRITE_METHODS.has(method)) {
    const csrf = csrfToken();
    if (!csrf) throw new Error('csrf_validation_failed');
    headers.set('x-admin-csrf', csrf);
  }

  const response = await fetch(toBffUrl(url), {
    ...options,
    method,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.assign(`/login?returnTo=${returnTo}`);
  }
  return response;
};

export const apiFetch = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetchWithAdminGuard(endpoint, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(typeof payload?.message === 'string' ? payload.message : `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
};
