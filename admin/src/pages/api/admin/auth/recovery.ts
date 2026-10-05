import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'node:crypto';
import { staffRoleOf } from '../../../../lib/admin-session';
import { enrollLoginDevice } from '../../../../lib/admin-login-device';

/**
 * C6 break-glass recovery for a locked-out admin (lost passkey devices).
 * - { action: 'start', email }: emails a one-time code.
 * - { action: 'redeem', email, email_code, recovery_code }: both codes together
 *   open a session; the backend marks it as a recovery session, which may
 *   enroll this browser and then a new passkey (X4).
 */
function backendBase() {
  const value = process.env.ADMIN_BACKEND_URL;
  if (!value) throw new Error('ADMIN_BACKEND_URL is required');
  return value.replace(/\/$/, '');
}

function cookie(name: string, value: string, httpOnly = true) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const maxAge = name === 'admin_refresh' ? 60 * 60 * 24 * 14 : name === 'admin_csrf' ? 60 * 60 * 24 : 60 * 60;
  return `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${maxAge}${httpOnly ? '; HttpOnly' : ''}${secure}`;
}

async function post(path: string, body: object) {
  const upstream = await fetch(`${backendBase()}/api/v1/auth/admin-recovery/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  return { upstream, payload: await upstream.json().catch(() => ({})) as Record<string, unknown> };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ code: 'method_not_allowed' });
  const { action, email, email_code: emailCode, recovery_code: recoveryCode } = (req.body || {}) as Record<string, unknown>;
  if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ code: 'email_required' });
  try {
    if (action === 'start') {
      const { upstream, payload } = await post('start', { email: email.trim() });
      return res.status(upstream.status).json(payload);
    }
    if (action !== 'redeem') return res.status(400).json({ code: 'action_required' });
    if (typeof emailCode !== 'string' || typeof recoveryCode !== 'string' || !emailCode || !recoveryCode) {
      return res.status(400).json({ code: 'email_code_and_recovery_code_required' });
    }
    const { upstream, payload } = await post('redeem', { email: email.trim(), email_code: emailCode.trim(), recovery_code: recoveryCode.trim() });
    if (!upstream.ok) return res.status(upstream.status).json(payload);
    const tokenField = payload.token as { accessToken?: string; refreshToken?: string } | string | undefined;
    const token = typeof tokenField === 'string' ? tokenField : tokenField?.accessToken;
    const refresh = typeof tokenField === 'object' ? tokenField?.refreshToken : undefined;
    if (!token) return res.status(502).json({ code: 'backend_login_missing_access_token' });
    if (!staffRoleOf(token)) return res.status(403).json({ code: 'admin_role_required' });
    const csrf = randomBytes(32).toString('base64url');
    const device = await enrollLoginDevice(backendBase(), token, req.cookies?.['admin_device']);
    const cookies = [cookie('admin_access', token), cookie('admin_csrf', csrf, false), device];
    if (refresh) cookies.push(cookie('admin_refresh', refresh));
    res.setHeader('set-cookie', cookies);
    return res.status(200).json({ user: payload.user || null, recovery: true });
  } catch (error) {
    console.error('admin_recovery_upstream_error', error);
    return res.status(502).json({ code: 'admin_backend_unavailable' });
  }
}
