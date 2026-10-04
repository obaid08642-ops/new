import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'node:stream';
import {
  backendBase,
  callerIdempotencyKey,
  isReplayable,
  upstreamRequest,
} from '@/lib/http/upstream';
import { IDEMPOTENCY_HEADER } from '@/lib/http/policy';

const ACCESS_COOKIE = 'admin_access';
const REFRESH_COOKIE = 'admin_refresh';
const CSRF_COOKIE = 'admin_csrf';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORWARDED_HEADERS = ['accept', 'content-type', 'if-match', 'if-none-match', 'x-step-up-token'];

function upstreamBase() {
  return backendBase();
}

function cookieValue(req: NextApiRequest, name: string) {
  return req.cookies[name] || null;
}

function csrfValid(req: NextApiRequest) {
  const sent = req.headers['x-admin-csrf'];
  const expected = cookieValue(req, CSRF_COOKIE);
  return typeof sent === 'string' && !!expected && sent === expected;
}

function incomingBody(req: NextApiRequest) {
  if (!WRITE_METHODS.has(req.method || 'GET')) return undefined;
  if (typeof req.body === 'string') return req.body;
  if (req.body === undefined || req.body === null) return undefined;
  return JSON.stringify(req.body);
}

function apiPath(req: NextApiRequest) {
  const segments = Array.isArray(req.query.path) ? req.query.path : [];
  const decoded = segments.map((segment) => decodeURIComponent(String(segment)));
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(req.query)) {
    if (key === 'path') continue;
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      if (typeof value === 'string') query.append(key, value);
    }
  }
  const suffix = query.toString();
  const encoded = segments.map((segment) => encodeURIComponent(String(segment))).join('/');
  // R6-2: pure 1:1 mapping — /api/admin/<x> → /api/v1/<x>. Admin pages call the
  // real backend paths (e.g. /api/admin/admin/finance/... for /api/v1/admin/...).
  // Server-side RBAC still applies; no rewrite rules live here.
  void decoded;
  return `/api/v1/${encoded}${suffix ? `?${suffix}` : ''}`;
}

/** One-shot refresh: returns fresh tokens + Set-Cookie headers, or null. */
async function tryRefresh(req: NextApiRequest): Promise<{ accessToken: string; cookies: string[] } | null> {
  const refreshToken = cookieValue(req, REFRESH_COOKIE);
  if (!refreshToken) return null;
  try {
    // Not retried: a refresh either issues a token or it does not, and replaying
    // it would race the cookie rotation below.
    const r = await upstreamRequest('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      idempotent: false,
    });
    if (!r.ok) return null;
    const payload: any = await r.json().catch(() => null);
    const accessToken = payload?.token?.accessToken || payload?.access_token || payload?.token;
    const refresh = payload?.token?.refreshToken || payload?.refresh_token;
    if (!accessToken) return null;
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const cookies = [`${ACCESS_COOKIE}=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60}${secure}`];
    if (refresh) cookies.push(`${REFRESH_COOKIE}=${encodeURIComponent(refresh)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}${secure}`);
    return { accessToken, cookies };
  } catch {
    return null;
  }
}

function copyResponseHeaders(response: Response, res: NextApiResponse) {
  const contentType = response.headers.get('content-type');
  const contentDisposition = response.headers.get('content-disposition');
  const cacheControl = response.headers.get('cache-control');
  res.setHeader('cache-control', cacheControl || 'no-store');
  if (contentType) res.setHeader('content-type', contentType);
  if (contentDisposition) res.setHeader('content-disposition', contentDisposition);
  if (cacheControl) res.setHeader('cache-control', cacheControl);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.method) return res.status(405).json({ code: 'method_not_allowed' });
  if (WRITE_METHODS.has(req.method) && !csrfValid(req)) {
    return res.status(403).json({ code: 'csrf_validation_failed' });
  }

  const accessToken = cookieValue(req, ACCESS_COOKIE);
  if (!accessToken) return res.status(401).json({ code: 'admin_session_required' });

  try {
    const headers = new Headers();
    for (const header of FORWARDED_HEADERS) {
      const value = req.headers[header];
      if (typeof value === 'string') headers.set(header, value);
    }
    headers.set('authorization', `Bearer ${accessToken}`);
    // Routes marked @RequireIdempotency reject writes without a key: keep the page's key, else mint one.
    // 15.1: the *caller's* key also decides replayability. A key minted here is
    // not reused across independent requests, so it must not make a write look
    // retryable — otherwise a slow write becomes a duplicate.
    const callerKey = WRITE_METHODS.has(req.method) ? callerIdempotencyKey(req.headers) : null;
    if (WRITE_METHODS.has(req.method)) {
      headers.set(IDEMPOTENCY_HEADER, callerKey || `admin-${crypto.randomUUID()}`);
    }
    headers.set('x-forwarded-for', req.socket.remoteAddress || '');
    headers.set('x-admin-bff', 'next-pages-router');
    // 7C-C3: the backend network-gate check needs this on every /api/v1/admin/* call.
    if (process.env.ADMIN_GATE_TOKEN) headers.set('x-admin-gate-token', process.env.ADMIN_GATE_TOKEN);
    // Device binding (NOT IP binding — mobile IPs rotate): stable per-browser id.
    let deviceId = cookieValue(req, 'admin_device');
    let setDeviceCookie: string | null = null;
    if (!deviceId || deviceId.length < 16) {
      deviceId = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
      setDeviceCookie = `admin_device=${deviceId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
    }
    headers.set('x-admin-device', deviceId);

    const response = await upstreamRequest(apiPath(req), {
      method: req.method,
      headers,
      body: incomingBody(req),
      idempotent: isReplayable(req.method, callerKey),
    });

    copyResponseHeaders(response, res);
    if (setDeviceCookie) res.appendHeader('set-cookie', setDeviceCookie);
    // BFF refresh flow: on 401, use the admin_refresh cookie → /auth/refresh → retry once.
    if (response.status === 401) {
      const refreshed = await tryRefresh(req);
      if (refreshed) {
        for (const c of refreshed.cookies) res.appendHeader('set-cookie', c);
        headers.set('authorization', `Bearer ${refreshed.accessToken}`);
        const retry = await upstreamRequest(apiPath(req), {
          method: req.method,
          headers,
          body: incomingBody(req),
          // Same request, same key: a 401 means the access token expired, not that
          // the write was lost. `idempotent: false` here keeps the plan's rule
          // intact for callers that sent no key — the replay below is the
          // pre-existing token-refresh flow, not a policy retry.
          idempotent: false,
        });
        copyResponseHeaders(retry, res);
        res.statusCode = retry.status;
        if (!retry.body) return res.end();
        const bytes = Buffer.from(await retry.arrayBuffer());
        return res.end(bytes);
      }
      res.setHeader('set-cookie', [
        `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
        `${REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
        `${CSRF_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`,
      ]);
    }

    res.statusCode = response.status;
    if (!response.body) return res.end();
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      res.setHeader('cache-control', 'no-cache, no-transform');
      res.setHeader('connection', 'keep-alive');
      Readable.fromWeb(response.body as never).pipe(res);
      return;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    return res.end(bytes);
  } catch (error) {
    console.error('admin_bff_upstream_error', error);
    return res.status(502).json({ code: 'admin_backend_unavailable' });
  }
}
