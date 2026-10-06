import type { NextApiRequest, NextApiResponse } from 'next';

const SUPPORT_COOKIE = 'admin_support_session';

function base() {
  const value = process.env.ADMIN_BACKEND_URL;
  if (!value) throw new Error('ADMIN_BACKEND_URL is required');
  return value.replace(/\/$/, '');
}

function expiredCookie() {
  return `${SUPPORT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

/**
 * Read-only support-session proof. The browser never receives the support
 * token and this endpoint cannot proxy arbitrary patient/provider mutations.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ code: 'method_not_allowed' });
  const supportToken = req.cookies[SUPPORT_COOKIE];
  if (!supportToken) return res.status(401).json({ code: 'support_session_required' });

  try {
    const upstream = await fetch(`${base()}/api/v1/support-session/context`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${supportToken}`,
        accept: 'application/json',
        'x-admin-bff': 'support-session',
      },
    });
    const payload = await upstream.json().catch(() => ({}));
    res.setHeader('cache-control', 'no-store');
    if (upstream.status === 401 || upstream.status === 403) res.setHeader('set-cookie', expiredCookie());
    return res.status(upstream.status).json(payload);
  } catch (error) {
    console.error('support_session_context_bff_error', error instanceof Error ? error.message : 'unknown');
    return res.status(502).json({ code: 'admin_backend_unavailable' });
  }
}
