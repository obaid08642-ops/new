import type { NextApiRequest, NextApiResponse } from 'next';

const ACCESS_COOKIE = 'admin_access';
const CSRF_COOKIE = 'admin_csrf';
const SUPPORT_COOKIE = 'admin_support_session';
function base() {   const value = process.env.ADMIN_BACKEND_URL;
 if (!value) throw new Error('ADMIN_BACKEND_URL is required'); return value.replace(/\/$/, ''); }
function cookie(req: NextApiRequest, name: string) { return req.cookies[name] || ''; }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ code: 'method_not_allowed' });
  const access = cookie(req, ACCESS_COOKIE); const csrf = cookie(req, CSRF_COOKIE); const sessionId = String(req.body?.session_id || '').trim();
  if (!access) return res.status(401).json({ code: 'admin_session_required' });
  if (!csrf || req.headers['x-admin-csrf'] !== csrf) return res.status(403).json({ code: 'csrf_validation_failed' });
  if (!sessionId) return res.status(400).json({ code: 'session_id_required' });
  try {
    const upstream = await fetch(`${base()}/api/v1/admin/impersonation/${encodeURIComponent(sessionId)}/revoke`, { method: 'POST', headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json', 'x-admin-bff': 'support-session' }, body: JSON.stringify({ reason: req.body?.reason }) });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(upstream.status).json(payload);
    res.setHeader('set-cookie', `${SUPPORT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    res.setHeader('cache-control', 'no-store');
    return res.status(upstream.status).json(payload);
  } catch (error) {
    console.error('support_session_revoke_bff_error', error instanceof Error ? error.message : 'unknown');
    return res.status(502).json({ code: 'admin_backend_unavailable' });
  }
}
