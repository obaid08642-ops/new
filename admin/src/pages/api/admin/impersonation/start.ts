import type { NextApiRequest, NextApiResponse } from 'next';

const ACCESS_COOKIE = 'admin_access';
const CSRF_COOKIE = 'admin_csrf';
const SUPPORT_COOKIE = 'admin_support_session';
const WRITE = 'POST';
function base() {   const value = process.env.ADMIN_BACKEND_URL;
 if (!value) throw new Error('ADMIN_BACKEND_URL is required'); return value.replace(/\/$/, ''); }
function cookie(req: NextApiRequest, name: string) { return req.cookies[name] || ''; }
function parseSetCookie(value: string) { return `${SUPPORT_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`; }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== WRITE) return res.status(405).json({ code: 'method_not_allowed' });
  const access = cookie(req, ACCESS_COOKIE); const csrf = cookie(req, CSRF_COOKIE);
  if (!access) return res.status(401).json({ code: 'admin_session_required' });
  if (!csrf || req.headers['x-admin-csrf'] !== csrf) return res.status(403).json({ code: 'csrf_validation_failed' });
  try {
    const upstream = await fetch(`${base()}/api/v1/admin/impersonation/start`, { method: WRITE, headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json', 'x-admin-bff': 'support-session' }, body: JSON.stringify(req.body || {}) });
    const payload = await upstream.json().catch(() => ({})) as Record<string, unknown>;
    if (!upstream.ok) return res.status(upstream.status).json(payload);
    const token = typeof payload.token === 'string' ? payload.token : '';
    const sessionId = typeof payload.session_id === 'string' ? payload.session_id : '';
    const safe = { ...payload };
    delete safe.token;
    if (!token || !sessionId) return res.status(502).json({ code: 'support_session_contract_invalid' });
    res.setHeader('set-cookie', parseSetCookie(token));
    res.setHeader('cache-control', 'no-store');
    return res.status(201).json(safe);
  } catch (error) {
    console.error('support_session_bff_error', error instanceof Error ? error.message : 'unknown');
    return res.status(502).json({ code: 'admin_backend_unavailable' });
  }
}
