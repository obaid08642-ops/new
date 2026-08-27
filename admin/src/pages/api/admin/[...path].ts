import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'node:stream';

const ACCESS_COOKIE = 'admin_access';
const REFRESH_COOKIE = 'admin_refresh';
const CSRF_COOKIE = 'admin_csrf';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORWARDED_HEADERS = ['accept', 'content-type', 'if-match', 'if-none-match'];

function upstreamBase() {
  const value = process.env.ADMIN_BACKEND_URL;
  if (!value) throw new Error('ADMIN_BACKEND_URL is required');
  return value.replace(/\/$/, '');
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
  // Explicitly allow only the existing read-only health/extension contracts;
  // every other path remains under /api/v1/admin and server-side RBAC.
  let upstreamPath = `/api/v1/admin/${encoded}`;
  // These legacy module prefixes are still real backend controllers, but their
  // browser transport is now forced through this BFF route.
  const modulePrefixes = new Set(['medicines', 'storage', 'insurance', 'emergency', 'legal', 'ai', 'users', 'orders', 'providers', 'pharmacy', 'labs', 'radiology', 'nursing']);
  if (modulePrefixes.has(decoded[0])) upstreamPath = `/api/v1/${encoded}`;
  if (decoded[0] === 'system-health') upstreamPath = `/api/v1/system-health/${decoded.slice(1).map(encodeURIComponent).join('/')}`;
  if (decoded[0] === 'nabd-extensions' && decoded[1] === 'admin') upstreamPath = `/api/v1/nabd-extensions/admin/${decoded.slice(2).map(encodeURIComponent).join('/')}`;
  if (decoded[0] === 'providers' && decoded[1] === 'provider-deltas') upstreamPath = `/api/v1/providers/provider-deltas${decoded.slice(2).length ? `/${decoded.slice(2).map(encodeURIComponent).join('/')}` : ''}`;
  return `${upstreamPath}${suffix ? `?${suffix}` : ''}`;
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
    headers.set('x-forwarded-for', req.socket.remoteAddress || '');
    headers.set('x-admin-bff', 'next-pages-router');

    const response = await fetch(`${upstreamBase()}${apiPath(req)}`, {
      method: req.method,
      headers,
      body: incomingBody(req),
      redirect: 'manual',
    });

    copyResponseHeaders(response, res);
    if (response.status === 401) {
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
