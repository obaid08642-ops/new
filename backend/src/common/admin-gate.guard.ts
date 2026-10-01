import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * C3: does this request carry the admin network-gate secret? The admin BFF adds
 * `x-admin-gate-token` server-side on every call it proxies; nothing else has it.
 * Not configured → fail closed in production, open in dev/test.
 */
export function adminGateSatisfied(headers: Record<string, unknown> | undefined): boolean {
  const expected = process.env.ADMIN_GATE_TOKEN;
  if (!expected) {
    if (process.env.NODE_ENV === 'production') throw new ForbiddenException('admin_gate_not_configured');
    return true;
  }
  const sent = headers?.['x-admin-gate-token'];
  if (typeof sent !== 'string') return false;
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * C3: Backend admin network gate. Independently rejects any /admin/* request
 * that did not come through the edge gate (Cloudflare Access or mTLS). The
 * reverse proxy injects a shared-secret header on every allowed request;
 * requests without it are denied even if they hold a valid admin JWT.
 * Admin-role calls on routes outside /api/v1/admin (/medicines/admin/*,
 * /ai/admin/*, /bulk-upload, ...) are gated by role in JwtAuthGuard.
 */
@Injectable()
export class AdminGateGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const path: string = String(req.path || req.url || '').split('?')[0];
    if (!path.startsWith('/api/v1/admin')) return true;
    if (!adminGateSatisfied(req.headers)) throw new ForbiddenException('admin_gate_required');
    return true;
  }
}
