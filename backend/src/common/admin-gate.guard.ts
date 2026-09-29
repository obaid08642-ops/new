import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * C3: Backend admin network gate. Independently rejects any /admin/* request
 * that did not come through the edge gate (Cloudflare Access or mTLS). The
 * reverse proxy injects a shared-secret header on every allowed request;
 * requests without it are denied even if they hold a valid admin JWT.
 */
@Injectable()
export class AdminGateGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const path: string = String(req.path || req.url || '').split('?')[0];
    if (!path.startsWith('/api/v1/admin')) return true;
    const token = req.headers['x-admin-gate-token'];
    const expected = process.env.ADMIN_GATE_TOKEN;
    if (!expected) {
      // Gate not configured — fail closed in production, open in dev/test.
      if (process.env.NODE_ENV === 'production') throw new ForbiddenException('admin_gate_not_configured');
      return true;
    }
    if (token !== expected) throw new ForbiddenException('admin_gate_required');
    return true;
  }
}
