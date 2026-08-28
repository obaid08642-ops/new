import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'node:crypto';

const ACCESS_COOKIE = 'admin_access';
const REFRESH_COOKIE = 'admin_refresh';
const CSRF_COOKIE = 'admin_csrf';

function backendBase() {
  const value = process.env.ADMIN_BACKEND_URL;
  if (!value) throw new Error('ADMIN_BACKEND_URL is required');
  return value.replace(/\/$/, '');
}

function cookie(name: string, value: string, options: { httpOnly?: boolean; maxAge?: number } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax'];
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  return parts.join('; ');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ code: 'method_not_allowed' });
  const body = req.body || {};
  if (!body.identifier || !body.password) return res.status(400).json({ code: 'identifier_and_password_required' });

  try {
    const upstream = await fetch(`${backendBase()}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        identifier: String(body.identifier),
        password: String(body.password),
        ...(body.code ? { code: String(body.code) } : {}),
      }),
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(upstream.status).json(payload);
    if ((payload as { requires_2fa?: boolean }).requires_2fa) return res.status(202).json(payload);
    if ((payload as { requires_passkey?: boolean }).requires_passkey) return res.status(202).json(payload);

    const token = (payload as any)?.token?.accessToken || (payload as any)?.access_token || (payload as any)?.token;
    const refresh = (payload as any)?.token?.refreshToken || (payload as any)?.refresh_token;
    if (!token) return res.status(502).json({ code: 'backend_login_missing_access_token' });

    const csrf = randomBytes(32).toString('base64url');
    const cookies = [
      cookie(ACCESS_COOKIE, token, { maxAge: 60 * 60 }),
      cookie(CSRF_COOKIE, csrf, { httpOnly: false, maxAge: 60 * 60 }),
    ];
    if (refresh) cookies.push(cookie(REFRESH_COOKIE, refresh, { maxAge: 60 * 60 * 24 * 14 }));
    res.setHeader('set-cookie', cookies);

    return res.status(200).json({
      user: (payload as any).user || null,
      requires_2fa: false,
    });
  } catch (error) {
    console.error('admin_login_upstream_error', error);
    return res.status(502).json({ code: 'admin_backend_unavailable' });
  }
}
