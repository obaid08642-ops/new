import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY, ROLES_KEY, SELF_SERVICE_KEY } from './auth.guard';
import { PERMISSIONS_KEY } from './permissions';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Deny-by-default guard for write operations (P1.1).
 *
 * Any HTTP POST/PUT/PATCH/DELETE handler WITHOUT an explicit access
 * declaration is rejected with 403 `role_declaration_missing`. A handler is
 * declared when it (or its controller class) carries at least one of:
 * - @Roles(...) — fixed role allow-list (admin/config/catalog/finance,
 *   provider operations),
 * - @RequirePermissions(...) — fine-grained permission allow-list,
 * - @Public() — intentionally anonymous (login, OTP request, signed webhooks),
 * - @SelfService() — authenticated actor on their own resources, ownership
 *   enforced at the service layer.
 *
 * Non-HTTP contexts (queues, crons, sockets) always pass — this guard only
 * governs the HTTP write surface. Read (GET/HEAD/OPTIONS) routes are out of
 * scope. Registration order: AFTER JwtAuthGuard (both are APP_GUARDs).
 */
@Injectable()
export class WriteGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    let req: any = null;
    try {
      req = ctx.switchToHttp().getRequest();
    } catch {
      return true;
    }
    if (!req || !req.method || !WRITE_METHODS.has(String(req.method).toUpperCase())) {
      return true;
    }
    const targets = [ctx.getHandler(), ctx.getClass()];
    const declared =
      !!this.reflector.getAllAndOverride<unknown[]>(ROLES_KEY, targets)?.length ||
      !!this.reflector.getAllAndOverride<unknown[]>(PERMISSIONS_KEY, targets)?.length ||
      !!this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets) ||
      !!this.reflector.getAllAndOverride<boolean>(SELF_SERVICE_KEY, targets);
    if (!declared) {
      throw new ForbiddenException('role_declaration_missing');
    }
    return true;
  }
}
