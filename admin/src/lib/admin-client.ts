import { STEP_UP_HEADER, isStepUpRefusal, requestStepUpToken, stepUpAction } from './step-up';

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

  const send = async () => {
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
    return { response, payload };
  };

  let { response, payload } = await send();
  // A sensitive action the backend wants re-confirmed with a fresh passkey: ask once, retry once with the token.
  if (!response.ok && writeMethods.has(method) && isStepUpRefusal(response.status, payload)) {
    headers.set(STEP_UP_HEADER, await passkeyStepUpToken(method, path));
    ({ response, payload } = await send());
  }

  if (!response.ok) throw new AdminApiError(response.status, payload);
  return payload as T;
}

let cachedEmail: string | null = null;

async function passkeyStepUpToken(method: string, path: string): Promise<string> {
  const { startAuthentication } = await import('@simplewebauthn/browser');
  try {
    return await requestStepUpToken(stepUpAction(method, bffPath(path)), {
      post: (to, body) => adminFetch<any>(to, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
      email: async () => {
        if (!cachedEmail) {
          const session = await adminFetch<AdminSession>('/api/admin/admin/session');
          cachedEmail = String(session?.user?.email || '').trim().toLowerCase();
        }
        if (!cachedEmail) throw new Error('step_up_email_missing');
        return cachedEmail;
      },
      assert: (optionsJSON) => startAuthentication({ optionsJSON }),
    });
  } catch (error) {
    // The admin closed the passkey prompt or the device refused: keep the original refusal's meaning.
    throw new AdminApiError(403, { code: 'step_up_cancelled', message: 'تعذّر تأكيد العملية بمفتاح الأمان. حاول مرة أخرى.', cause: error instanceof Error ? error.message : 'unknown' });
  }
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
