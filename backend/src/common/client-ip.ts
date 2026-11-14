import type { Request } from 'express';

/**
 * The address of the caller, for per-IP limits (SMS-pumping guard, login throttles) and audit rows.
 *
 * Uses `req.ip`: Express resolves it from `X-Forwarded-For` counting `trust proxy` hops (TRUST_PROXY_HOPS, default 2) from the RIGHT, so only
 * the entries our own proxies appended count. The FIRST `X-Forwarded-For` entry is not used: nginx appends to whatever the client sent
 * (`$proxy_add_x_forwarded_for`), so the first entry is client-chosen and a rotating fake value there would defeat every per-IP limit.
 */
export function clientIp(req: Pick<Request, 'ip'> & { socket?: { remoteAddress?: string } }): string | undefined {
  const ip = String(req?.ip || req?.socket?.remoteAddress || '').trim();
  return ip || undefined;
}
