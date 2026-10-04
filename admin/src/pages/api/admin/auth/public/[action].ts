import type { NextApiRequest, NextApiResponse } from 'next';
import { upstreamRequest } from '@/lib/http/upstream';

const ALLOWED_ACTIONS = new Set(['send-otp', 'reset-password']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ code: 'method_not_allowed' });
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  if (!action || !ALLOWED_ACTIONS.has(action)) return res.status(404).json({ code: 'not_found' });

  try {
    // 15.1: send-otp and reset-password are rate-limited, non-idempotent
    // writes — a timeout must not turn into a second SMS or a second token.
    const upstream = await upstreamRequest(`/api/v1/auth/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(req.body || {}),
      idempotent: false,
    });
    const payload = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(payload);
  } catch (error) {
    console.error('admin_public_auth_upstream_error', error);
    return res.status(502).json({ code: 'admin_backend_unavailable' });
  }
}
