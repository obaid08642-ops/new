import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'node:crypto';
import { upstreamRequest } from '@/lib/http/upstream';

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
    // 15.1: an OTP verification is a single-use credential — never retried.
    const upstream = await upstreamRequest('/api/v1/auth/login/verify-2fa', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ identifier: String(identifier), code: String(code) }),
      idempotent: false,
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(upstream.status).json(payload);

    const token = (payload as any)?.token?.accessToken || (payload as any)?.access_token || (payload as any)?.token;
    const refresh = (payload as any)?.token?.refreshToken || (payload as any)?.refresh_token;
    if (!token) return res.status(502).json({ code: 'backend_login_missing_access_token' });
    const csrf = randomBytes(32).toString('base64url');
    // 7C-C2: enroll this browser's device id so the mandatory allow-list accepts it.
    let deviceId = req.cookies?.['admin_device'];
    if (!deviceId || deviceId.length < 16) {
      deviceId = [...randomBytes(32)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    try {
      const enrollHeaders: Record<string, string> = { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-admin-device': deviceId };
      if (process.env.ADMIN_GATE_TOKEN) enrollHeaders['x-admin-gate-token'] = process.env.ADMIN_GATE_TOKEN;
      await upstreamRequest('/api/v1/admin/devices/enroll', {
        method: 'POST',
        headers: enrollHeaders,
        body: JSON.stringify({ device_id: deviceId, name: 'admin-browser' }),
        idempotent: false,
      }).catch(() => null);
    } catch { /* enrollment failure surfaces as device_not_enrolled on next call */ }
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const cookies = [cookie('admin_access', token), cookie('admin_csrf', csrf, false),
      `admin_device=${encodeURIComponent(deviceId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}${secure}`];
    if (refresh) cookies.push(cookie('admin_refresh', refresh));
    res.setHeader('set-cookie', cookies);
    return res.status(200).json({ user: (payload as any).user || null, requires_2fa: false });
  } catch (error) {
    console.error('admin_2fa_upstream_error', error);
    return res.status(502).json({ code: 'admin_backend_unavailable' });
  }
}
