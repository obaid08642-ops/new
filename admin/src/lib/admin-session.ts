/**
 * R11 §5 lead 15: the admin BFF forwarded whatever JWT sat in the admin_access
 * cookie together with ADMIN_GATE_TOKEN, so a patient who logged in through
 * /api/admin/auth/login (or set the cookie by hand) got the network gate for
 * free. Only staff access tokens may enter the admin session. The backend still
 * verifies the signature and RBAC; this only decides what the BFF forwards.
 */
export const STAFF_ROLES = new Set(['admin', 'super_admin', 'support_agent', 'finance']);

/** The staff role in an access token's payload, or null for any other token. */
export function staffRoleOf(token: string | null | undefined): string | null {
  const part = typeof token === 'string' ? token.split('.')[1] : undefined;
  if (!part) return null;
  try {
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object') return null;
    if (payload.type === 'refresh' || payload.purpose || payload.scope) return null;
    return typeof payload.role === 'string' && STAFF_ROLES.has(payload.role) ? payload.role : null;
  } catch {
    return null;
  }
}
