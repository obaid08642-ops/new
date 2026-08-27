import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from './enums';
import { Permission, ROLE_PERMISSIONS, PERMISSIONS_KEY, CHECK_OWNERSHIP_KEY, OwnershipOptions } from './permissions';
import { roleSatisfies, mergePermissions } from './rbac';
import { ImpersonationSessionService } from './impersonation-session.service';

// ── Dynamic RBAC (A1) ─────────────────────────────────────────
// Custom roles live in `admin_custom_roles`; users reference them through
// `custom_role_keys` on their document. Resolution is cached for 30s and can
// be invalidated by RBAC mutations via invalidateDynamicRoleCache().
const DYNAMIC_ROLE_TTL_MS = 30_000;
const dynamicRoleCache = new Map<string, { perms: string[]; exp: number }>();

export function invalidateDynamicRoleCache() {
  dynamicRoleCache.clear();
}

async function resolveCustomRolePermissions(connection: Connection, payload: any): Promise<string[]> {
  const keys: string[] = Array.isArray(payload?.custom_role_keys) ? payload.custom_role_keys.map(String) : [];
  if (!keys.length) return [];
  const ck = keys.slice().sort().join(',');
  const now = Date.now();
  const hit = dynamicRoleCache.get(ck);
  if (hit && hit.exp > now) return hit.perms;
  let docs: any[] = [];
  try {
    docs = await connection.collection('admin_custom_roles').find({ key: { $in: keys } }).toArray();
  } catch {
    docs = []; // fail closed: no collection → no extra permissions
  }
  const perms = mergePermissions(...docs.map((d) => d?.permissions || []));
  dynamicRoleCache.set(ck, { perms, exp: now + DYNAMIC_ROLE_TTL_MS });
  return perms;
}
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<UserRole | string>) => SetMetadata(ROLES_KEY, roles);

const PENDING_PROVIDER_ONBOARDING_PATH = /^\/api\/v1\/provider-onboarding\/(my-profile|step2|step3|submit|progress|contract)$/;

/** Normalize role/provider_type aliases before evaluating @Roles. */
export function normalizeEffectiveRole(value: unknown): string {
  const role = String(value || '').trim().toLowerCase();
  const aliases: Record<string, string> = {
    laboratory: UserRole.LAB,
    lab: UserRole.LAB,
    radiology_center: UserRole.RADIOLOGY,
    radiology: UserRole.RADIOLOGY,
    hospital: UserRole.HOSPITAL,
    hospital_admin: UserRole.HOSPITAL_ADMIN,
    pharmacy: UserRole.PHARMACY,
    pharmacist: UserRole.PHARMACIST,
    homecare: UserRole.HOME_CARE,
    home_care: UserRole.HOME_CARE,
    nursing: UserRole.NURSING,
    nurse: UserRole.NURSE,
  };
  return aliases[role] || role;
}

export function getEffectiveRoles(user: any): string[] {
  return Array.from(new Set([
    normalizeEffectiveRole(user?.role),
    normalizeEffectiveRole(user?.provider_type),
    normalizeEffectiveRole(user?.providerType),
  ].filter(Boolean)));
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
    @InjectConnection() private connection: Connection,
    private impersonationSessions: ImpersonationSessionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: any; impersonator?: any; auditInfo?: any }>();
    
    // Extract IP and User Agent
    // Express applies the configured trusted-proxy policy to req.ip. Reading a
    // caller-supplied X-Forwarded-For value directly would let a client forge
    // security audit attribution.
    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    req.auditInfo = { ip, userAgent };

    const auth = req.headers.authorization || '';
    let token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    // Browser authentication is terminated by the admin BFF. The backend accepts
    // only the Authorization header forwarded by that trusted boundary.
    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Missing token');
    }

    let payload: any;
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') throw new UnauthorizedException('JWT secret is not configured');
      payload = secret ? await this.jwt.verifyAsync(token, { secret }) : await this.jwt.verifyAsync(token);
    } catch (e) {
      if (isPublic) return true;
      throw new UnauthorizedException('Invalid token');
    }

    // Attach original user payload to request. Support tokens are validated against
    // the durable session on every request, so revoke/expiry takes effect immediately.
    req.user = payload;
    if (payload?.scope === 'impersonation') {
      const context = await this.impersonationSessions.validate(payload);
      req.impersonator = context.impersonator;
      req.auditInfo = { ...req.auditInfo, impersonator_id: context.impersonator.id, impersonation_session_id: context.session.id, target_user_id: payload.id || payload.sub };
    }

    // A provider JWT is not itself proof of operational approval. Pending KYC
    // accounts may access only their own onboarding/contract steps; every other
    // provider operation fails closed until the provider account is approved.
    if (payload?.scope === 'provider') {
      const account: any = await this.connection.collection('provider_accounts').findOne(
        { id: payload.id }, { projection: { status: 1 } },
      );
      if (!account) throw new UnauthorizedException('provider_account_not_found');
      const path = String((req as any).path || (req as any).originalUrl || (req as any).url || '').split('?')[0];
      if (String(account.status || '').toLowerCase() !== 'approved' && !PENDING_PROVIDER_ONBOARDING_PATH.test(path)) {
        throw new ForbiddenException('provider_approval_required');
      }
    }

    // Header-based impersonation carries no case, purpose, approval, expiry,
    // target scope or durable session proof. Do not substitute identities until
    // a separately governed impersonation-session contract exists.
    const impersonateUserId = req.headers['x-impersonate-user-id'] as string;
    if (impersonateUserId) {
      throw new ForbiddenException('impersonation_session_required');
    }

    // Role check (fallback compatibility) — hierarchy-aware: super_admin
    // satisfies @Roles(ADMIN); nothing else inherits (fixes the A1 bug where
    // super_admin accounts were 403'd out of every admin controller).
    const effectiveRoles = getEffectiveRoles(payload);
    const roles = this.reflector.getAllAndOverride<Array<UserRole | string>>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (roles && roles.length && !roles.some(required => roleSatisfies(normalizeEffectiveRole(String(required)), effectiveRoles))) {
      throw new ForbiddenException('Insufficient role');
    }

    // Fine-grained Permission check — static matrix + JWT grants + dynamic
    // custom roles resolved from `admin_custom_roles` (cached).
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (requiredPermissions && requiredPermissions.length) {
      const customPerms = await resolveCustomRolePermissions(this.connection, payload);
      const userPermissions = mergePermissions(
        ...effectiveRoles.map(role => ROLE_PERMISSIONS[role as UserRole] || []),
        customPerms,
        payload.permissions || [],
      );

      const hasPermission = requiredPermissions.every(p => userPermissions.includes(p));
      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Ownership Isolation check
    const ownershipOptions = this.reflector.getAllAndOverride<OwnershipOptions>(CHECK_OWNERSHIP_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (ownershipOptions && payload.role !== UserRole.SUPER_ADMIN && payload.role !== UserRole.ADMIN) {
      const resourceId = req.params[ownershipOptions.paramName || 'id'] || 
                         req.query[ownershipOptions.paramName || 'id'] || 
                         req.body[ownershipOptions.paramName || 'id'];
      
      if (resourceId) {
        const modelName = ownershipOptions.model;
        const model = this.connection.model(modelName);
        if (model) {
          // Attempt string match or ObjectId match
          const query = { id: resourceId };
          const resource = (await model.findOne(query).lean()) as any;
          if (!resource) {
            throw new NotFoundException(`Resource ${modelName} not found`);
          }

          const userId = payload.id;
          const facilityId = payload.facility_id || payload.parent_provider_account_id;

          const isOwner = resource[ownershipOptions.ownerField] === userId;
          let isProvider = false;
          
          if (ownershipOptions.providerField) {
            const pField = resource[ownershipOptions.providerField];
            isProvider = pField === userId || (facilityId && pField === facilityId);
          }

          if (!isOwner && !isProvider) {
            throw new ForbiddenException('Access denied: You do not own this resource');
          }
        }
      }
    }

    return true;
  }
}

import { createParamDecorator } from '@nestjs/common';
export const CurrentUser = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return data ? req.user?.[data] : req.user;
});

/** Blocks guest accounts from member-only areas (insurance, family, records). */
@Injectable()
export class NoGuestsGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    // Block by flag OR by role — a missing is_guest flag must never grant access
    if (req.user?.is_guest || req.user?.role === 'guest') {
      throw new ForbiddenException('هذه الميزة تتطلب إنشاء حساب — Registration required');
    }
    return true;
  }
}
