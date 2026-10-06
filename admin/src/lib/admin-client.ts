export interface AdminSession {
  user: {
    id: string;
    role: string;
    full_name?: string;
    email?: string;
  };
  permissions: string[];
  impersonator?: { id: string; full_name?: string } | null;
}

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(`Admin API request failed with status ${status}`);
  }
}

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

export async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (writeMethods.has(method)) {
    const token = csrfToken();
    if (!token) throw new AdminApiError(403, { code: 'missing_csrf_token' });
    headers.set('x-admin-csrf', token);
  }

  const response = await fetch(bffPath(path), {
    ...options,
    method,
    headers,
    credentials: 'same-origin',
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) throw new AdminApiError(response.status, payload);
  return payload as T;
}

export function adminMutation<T>(path: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown) {
  return adminFetch<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiErrorMessage(error: unknown, fallback = 'تعذر تنفيذ الطلب. حاول لاحقاً.') {
  if (error instanceof AdminApiError) {
    const payload = error.payload as { message?: string | string[]; error?: string } | null;
    if (Array.isArray(payload?.message)) return payload.message.join('، ');
    if (typeof payload?.message === 'string') return payload.message;
    if (typeof payload?.error === 'string') return payload.error;
    if (error.status === 401) return 'انتهت جلسة الإدارة. سجّل الدخول مرة أخرى.';
    if (error.status === 403) return 'ليس لديك الإذن اللازم لتنفيذ هذه العملية.';
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
