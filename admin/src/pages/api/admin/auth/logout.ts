import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ code: 'method_not_allowed' });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('set-cookie', [
    `admin_access=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    `admin_refresh=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    `admin_csrf=; Path=/; SameSite=Lax; Max-Age=0${secure}`,
  ]);
  return res.status(200).json({ ok: true });
}
