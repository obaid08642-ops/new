import type { NextApiRequest, NextApiResponse } from 'next';
import { staffRoleOf } from '../../../../lib/admin-session';
import { enrollLoginDevice } from '../../../../lib/admin-login-device';
import { randomBytes } from 'node:crypto';

function backendBase() {
  const value = process.env.ADMIN_BACKEND_URL;
  if (!value) throw new Error('ADMIN_BACKEND_URL is required');
  return value.replace(/\/$/, '');
}

function cookie(name: string, value: string, httpOnly = true) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  // The refresh cookie must outlive the 1h access cookie, or the BFF refresh-on-401 never has a token to use.
  const maxAge = name === 'admin_refresh' ? 60 * 60 * 24 * 14 : name === 'admin_csrf' ? 60 * 60 * 24 : 60 * 60;
  return `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${maxAge}${httpOnly ? '; HttpOnly' : ''}${secure}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ code: 'method_not_allowed' });
  const { identifier, code } = req.body || {};
  if (!identifier || !code) return res.status(400).json({ code: 'identifier_and_code_required' });

  try {
    const upstream = await fetch(`${backendBase()}/api/v1/auth/login/verify-2fa`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ identifier: String(identifier), code: String(code) }),
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(upstream.status).json(payload);

    const token = (payload as any)?.token?.accessToken || (payload as any)?.access_token || (payload as any)?.token;
    const refresh = (payload as any)?.token?.refreshToken || (payload as any)?.refresh_token;
    if (!token) return res.status(502).json({ code: 'backend_login_missing_access_token' });
    // R11 §5: only staff accounts get an admin session.
    if (!staffRoleOf(token)) return res.status(403).json({ code: 'admin_role_required' });
    const csrf = randomBytes(32).toString('base64url');
    const deviceCookie = await enrollLoginDevice(backendBase(), token, req.cookies?.['admin_device']);
    const cookies = [cookie('admin_access', token), cookie('admin_csrf', csrf, false), deviceCookie];
    if (refresh) cookies.push(cookie('admin_refresh', refresh));
    res.setHeader('set-cookie', cookies);
    return res.status(200).json({ user: (payload as any).user || null, requires_2fa: false });
  } catch (error) {
    console.error('admin_2fa_upstream_error', error);
    return res.status(502).json({ code: 'admin_backend_unavailable' });
  }
}
