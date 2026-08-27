import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'node:stream';

const ACCESS_COOKIE = 'admin_access';
const REFRESH_COOKIE = 'admin_refresh';
const CSRF_COOKIE = 'admin_csrf';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORWARDED_HEADERS = ['accept', 'content-type', 'if-match', 'if-none-match'];

function upstreamBase() {
  const value = process.env.ADMIN_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
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
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(req.query)) {
    if (key === 'path') continue;
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      if (typeof value === 'string') query.append(key, value);
    }
  }
  const suffix = query.toString();
  return `/api/v1/admin/${segments.map(encodeURIComponent).join('/')}${suffix ? `?${suffix}` : ''}`;
}

function copyResponseHeaders(response: Response, res: NextApiResponse) {
  const contentType = response.headers.get('content-type');
  const contentDisposition = response.headers.get('content-disposition');
  const cacheControl = response.headers.get('cache-control');
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
