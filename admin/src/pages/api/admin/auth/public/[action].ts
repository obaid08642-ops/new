import type { NextApiRequest, NextApiResponse } from 'next';

const ALLOWED_ACTIONS = new Set(['send-otp', 'reset-password']);

function backendBase() {
  const value = process.env.ADMIN_BACKEND_URL;
  if (!value) throw new Error('ADMIN_BACKEND_URL is required');
  return value.replace(/\/$/, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ code: 'method_not_allowed' });
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  if (!action || !ALLOWED_ACTIONS.has(action)) return res.status(404).json({ code: 'not_found' });

  try {
    const upstream = await fetch(`${backendBase()}/api/v1/auth/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    const payload = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(payload);
  } catch (error) {
    console.error('admin_public_auth_upstream_error', error);
    return res.status(502).json({ code: 'admin_backend_unavailable' });
  }
}
