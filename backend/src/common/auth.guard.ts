import { Injectable, CanActivate, ExecutionContext, Optional, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminSessionService } from '../modules/auth/admin-session.service';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from './enums';
import { Permission, PERMISSIONS_KEY, CHECK_OWNERSHIP_KEY, OwnershipOptions } from './permissions';
import { roleSatisfies } from './rbac';
export { roleSatisfies } from './rbac';
import { ImpersonationSessionService } from './impersonation-session.service';
import { adminGateSatisfied } from './admin-gate.guard';
import { hasEffectivePermission, resolveEffectivePermissions } from './effective-permissions';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Compatibility hook for RBAC mutation handlers. Effective permissions are no
 * longer cached in this guard, so there is no stale in-process entry to clear.
 */
export function invalidateDynamicRoleCache() {}

export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<UserRole | string>) => SetMetadata(ROLES_KEY, roles);
/**
 * Marks an endpoint as self-service: the authenticated actor operates only on
 * their own resources (patient creating their own order, provider updating
 * their own profile, etc.). Unlike @Public(), it still requires a valid JWT;
 * unlike @Roles(), it does not restrict to a fixed role set. Ownership itself
 * is enforced at the service layer (owner checks) — this decorator is the
 * explicit declaration that satisfies the deny-by-default write guard.
 */
export const SELF_SERVICE_KEY = 'isSelfService';
export const SelfService = () => SetMetadata(SELF_SERVICE_KEY, true);

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

/** True when the user's role or provider_type (provider-auth tokens carry role 'provider') is one of `roles`. */
export function hasEffectiveRole(user: any, ...roles: string[]): boolean {
  const mine = getEffectiveRoles(user);
  return roles.some((r) => mine.includes(normalizeEffectiveRole(r)));
}

export function getEffectiveRoles(user: any): string[] {
  return Array.from(new Set([
    normalizeEffectiveRole(user?.role),
    normalizeEffectiveRole(user?.provider_type),
    normalizeEffectiveRole(user?.providerType),
  ].filter(Boolean)));
}

/**
 * R11 §5: only access tokens authenticate (REST and sockets). Every other token
 * signed with JWT_SECRET carries a marker (refresh `type`, QR `type`/`scope`,
 * `purpose`) or lacks the subject id and role an access token always has.
 */
/**
 * R11 §5: platform staff roles (admin console accounts). Every one of them is
 * honoured only through the admin gate and from an enrolled device. finance
 * holds DATA_EXPORT and payout approval; support_agent can impersonate.
 */
export const PLATFORM_STAFF_ROLES = ['admin', 'super_admin', 'support_agent', 'finance'];
export function isPlatformStaffRole(role: unknown): boolean {
  return typeof role === 'string' && PLATFORM_STAFF_ROLES.includes(role.toLowerCase());
}

/**
 * R11: authenticate a socket handshake with the same JwtAuthGuard pipeline as
 * REST (access-token kind, token_version, provider status, staff gate and
 * device lock, impersonation session). Returns the user, or null if refused.
 */
export async function authenticateSocketToken(guard: { canActivate(ctx: ExecutionContext): Promise<boolean> | boolean }, token: string, headers: Record<string, unknown> = {}, remoteAddress = ''): Promise<any | null> {
  const req: any = {
    headers: { ...headers, authorization: `Bearer ${token}` },
    path: '/socket.io', url: '/socket.io', originalUrl: '/socket.io',
    params: {}, query: {}, body: {}, ip: remoteAddress, socket: { remoteAddress },
  };
  const ctx: any = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
    getHandler: () => authenticateSocketToken,
    getClass: () => Object,
    getType: () => 'http',
  };
  try {
    return (await guard.canActivate(ctx)) && req.user ? req.user : null;
  } catch {
    return null;
  }
}

/**
 * True only when the store positively shows this session was revoked after
 * the socket connected: token_version bumped (ban, suspend, password or role
 * change, revoke), the user deactivated, or the provider account no longer
 * approved. Token expiry is not a revoke (the socket was authenticated at
 * connect), and a lookup error keeps the socket (unknown is not revoked).
 */
export async function socketSessionRevoked(conn: { collection(name: string): any }, payload: any, opts: { adminDeviceHash?: string } = {}): Promise<boolean> {
  const id = payload?.id || payload?.sub;
  if (!id) return false;
  try {
    // Impersonation tokens carry no tv: the durable session decides (as
    // ImpersonationSessionService.validate does on every request).
    if (payload?.scope === 'impersonation') {
      const sid = String(payload?.impersonation_session_id || '');
      if (!sid) return true;
      const session: any = await conn.collection('impersonation_sessions').findOne({ id: sid }, { projection: { status: 1, expiresAt: 1, impersonator_id: 1 } });
      if (!session || session.status !== 'active') return true;
      if (new Date(session.expiresAt).getTime() <= Date.now()) return true;
      const actor: any = await conn.collection('users').findOne({ id: String(session.impersonator_id) }, { projection: { id: 1, role: 1, active: 1, suspended: 1, custom_role_keys: 1, permissions: 1 } });
      if (!actor || actor.active === false || actor.suspended === true) return true;
      // Same rule as ImpersonationSessionService.validate on every request.
      if (!(await hasEffectivePermission(conn as never, actor, Permission.USER_IMPERSONATE))) return true;
    }
    // A staff socket (role, or an admin entry in roles[], as the REST guard
    // reads it) stays tied to the enrolled device it connected from; with no
    // device recorded at connect it is not kept.
    const staff = isPlatformStaffRole(payload?.role) || (Array.isArray(payload?.roles) && payload.roles.some((r: string) => /admin/i.test(r)));
    if (staff && !opts.adminDeviceHash) return true;
    if (staff && opts.adminDeviceHash) {
      const dev: any = await conn.collection('admin_devices').findOne({ user_id: String(id), device_hash: opts.adminDeviceHash }, { projection: { revoked: 1 } });
      if (!dev || dev.revoked === true) return true;
    }
    if (payload?.scope === 'provider') {
      const acc: any = await conn.collection('provider_accounts').findOne({ id: String(id) }, { projection: { token_version: 1, status: 1 } });
      if (!acc) return true;
      if (payload.tv !== undefined && payload.tv !== null && Number(acc.token_version ?? 0) !== Number(payload.tv)) return true;
      return String(acc.status || '').toLowerCase() !== 'approved';
    }
    const user: any = await conn.collection('users').findOne({ id: String(id) }, { projection: { token_version: 1, active: 1 } });
    if (!user) return payload?.tv !== undefined && payload?.tv !== null;
    if (user.active === false) return true;
    return payload?.tv !== undefined && payload?.tv !== null && Number(user.token_version ?? 0) !== Number(payload.tv);
  } catch {
    return false;
  }
}

/** Disconnects every open socket whose session was revoked (see socketSessionRevoked). */
export async function revalidateOpenSockets(conn: { collection(name: string): any }, sockets: Iterable<any>): Promise<number> {
  let dropped = 0;
  for (const socket of sockets) {
    const user = socket?.data?.user;
    if (!user) continue;
    if (await socketSessionRevoked(conn, user, { adminDeviceHash: socket?.data?.adminDeviceHash })) { socket.disconnect(true); dropped += 1; }
  }
  return dropped;
}

export function isAccessTokenPayload(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.type === 'refresh' || payload.type === 'qr') return false;
  if (payload.purpose !== undefined && payload.purpose !== null) return false;
  if (payload.scope === 'health_passport') return false;
  return !!(payload.id || payload.sub) && typeof payload.role === 'string' && payload.role.length > 0;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
    @InjectConnection() private connection: Connection,
    private impersonationSessions: ImpersonationSessionService,
    @Optional() private adminIdle?: AdminSessionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: any; impersonator?: any; impersonationSession?: any; auditInfo?: any }>();
    
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
      if (!secret) throw new UnauthorizedException('JWT secret is not configured');
      payload = await this.jwt.verifyAsync(token, { secret });
    } catch (e) {
      if (isPublic) return true;
      throw new UnauthorizedException('Invalid token');
    }

    // R11 §5: refresh, QR, chat-realtime and other non-access tokens share
    // JWT_SECRET; none of them may authenticate a request.
    if (!isAccessTokenPayload(payload)) {
      if (isPublic) return true;
      throw new UnauthorizedException('Invalid token');
    }

    // Attach original user payload to request. Support tokens are validated against
    // durable session on every request, so revoke/expiry takes effect immediately.
    req.user = payload;
    // F09 session revocation: login access tokens carry `tv` (token_version).
    // Ban, suspend, password change and role change bump the stored version,
    // so stale tokens 401 on their next request. On public routes a stale
    // token degrades to anonymous, matching the existing invalid-token
    // leniency for public endpoints.
    //
    // The version is compared against the store that SIGNED the token:
    // provider-scope tokens are signed from provider_accounts.token_version,
    // everything else from users.token_version. Since P2.1 a provider account
    // shares its id with the linked user, so checking users first would
    // compare against the wrong counter (suspend would not revoke, and a
    // provider password reset would lock the provider out).
    //
    // Tokens without `tv` (impersonation/support sessions — validated against
    // their durable session above — health-passport QR tokens, and access
    // tokens issued before this release, max 1h) are not version-checked.
    const subjectId = payload?.id || payload?.sub;
    if (subjectId && payload?.tv !== undefined && payload?.tv !== null) {
      // Throw-safe lookup: test doubles may return non-promises or throw
      // synchronously; any lookup failure degrades to "unknown subject".
      const lookup = async (fn: () => any) => {
        try { return (await fn()) || null; } catch { return null; }
      };
      const current: any = payload?.scope === 'provider'
        ? await lookup(() => this.connection.collection('provider_accounts').findOne(
          { id: subjectId }, { projection: { token_version: 1 } },
        ))
        : await lookup(() => this.connection.collection('users').findOne(
          { id: subjectId }, { projection: { token_version: 1 } },
        ));
      const currentTv = Number(current?.token_version ?? 0);
      const tokenTv = Number(payload.tv);
      if (tokenTv !== currentTv) {
        if (isPublic) {
          req.user = undefined;
          return true;
        }
        throw new UnauthorizedException('session_revoked');
      }
    }
    // C2: Admin device allow-list — MANDATORY for every admin/super_admin JWT.
    // Device-bound, never IP-bound (mobile IPs rotate). Any admin API call from
    // an unregistered device is rejected. The device-management endpoints and
    // login are exempt so the owner can enroll devices.
    try {
      const path = String((req as any).path || (req as any).originalUrl || (req as any).url || '').split('?')[0];
      // R11 §5: every platform staff role (support_agent can impersonate) is
      // gated and device-locked, not only admin / super_admin.
      const isAdminRole = isPlatformStaffRole(payload?.role)
        || (Array.isArray(payload?.roles) && payload.roles.some((r: string) => /admin/i.test(r)));
      // X4: anchored, so a path that merely contains these segments is not exempt.
      const isDeviceEndpoint = /^\/api\/v1\/admin\/devices(\/|$)/.test(path) || /^\/api\/v1\/auth\/(login|heartbeat)(\/|$)/.test(path);
      if (isAdminRole && !isPublic) {
        // C3: an admin token is only honoured when it came through the admin gate (the BFF),
        // on EVERY path, not just /api/v1/admin/* (96 admin routes live elsewhere).
        if (!adminGateSatisfied(req.headers as any)) throw new ForbiddenException('admin_gate_required');
      }
      if (isAdminRole && !isDeviceEndpoint && !isPublic) {
        const uid = payload?.id || payload?.sub;
        if (uid) {
          const devId = String((req.headers as any)?.['x-admin-device'] || '');
          const { createHash } = require('crypto');
          const dev = devId.length >= 16 && await this.connection.collection('admin_devices').findOne(
            { user_id: uid, device_hash: createHash('sha256').update(devId).digest('hex'), revoked: { $ne: true } },
          ).catch(() => null);
          if (!dev) throw new ForbiddenException('device_not_enrolled');
          // C2/X4: a device enrolled by a passkey login is bound to that
          // credential; removing the passkey revokes the device with it.
          if (dev.credential_id) {
            const live = await this.connection.collection('passkey_credentials').findOne(
              { user_id: uid, credential_id: dev.credential_id }, { projection: { _id: 1 } },
            );
            if (!live) throw new ForbiddenException('device_credential_revoked');
          }
          // C5: sliding 15-minute idle window for admin sessions.
          if (this.adminIdle) {
            if (await this.adminIdle.isIdleExpired(uid)) {
              throw new UnauthorizedException('admin_session_idle_expired');
            }
            await this.adminIdle.touch(uid);
          }
          // X4: bootstrap session (no passkey yet) may only call passkey
          // enrollment and device endpoints. Every other admin route gets 403.
          // Only enforced when ADMIN_PASSKEY_ENFORCED=true (production); the
          // live gate and development use password+OTP without a passkey.
          // X4: only the real enrollment endpoints (anchored), never any path that merely contains them.
          const isPasskeyEndpoint = /^\/api\/v1\/auth\/passkey\//.test(path) || /^\/api\/v1\/admin\/devices(\/|$)/.test(path);
          if (!isPasskeyEndpoint && process.env.ADMIN_PASSKEY_ENFORCED === 'true') {
            const hasPasskey = await this.connection.collection('passkey_credentials').findOne(
              { user_id: uid },
            ).catch(() => null);
            if (!hasPasskey) throw new ForbiddenException('passkey_enrollment_required');
            // A browser enrolled during bootstrap (no passkey then) is not bound to
            // a credential: once a passkey exists, sign in with it to bind the
            // device. A break-glass recovery session keeps working (C6).
            if (!dev.credential_id && payload?.rec !== 1) throw new ForbiddenException('device_rebind_required');
          }
        }
      }
    } catch (e: any) {
      if (e?.message === 'device_not_enrolled' || e?.message === 'admin_session_idle_expired' || e?.status === 403 || e?.status === 401) throw e;
      // Observability must never break auth on DB hiccups (fail-open here would
      // defeat the lock; fail-closed would lock everyone on a blip) — fail OPEN
      // but only when the lookup itself errored, never on a negative result.
    }
    if (payload?.scope === 'impersonation') {
      const context = await this.impersonationSessions.validate(payload);
      req.impersonator = context.impersonator;
      req.impersonationSession = context.session;
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
    // A @Public route is open to everyone: signing in must not turn it into a 403. Without this a
    // class-level @Roles(ADMIN) was applied to its public handlers (medicine search, provider
    // directory, legal pages, feature flags) whenever the caller sent a token, i.e. for every
    // signed-in patient and provider.
    if (isPublic) return true;
    const roles = this.reflector.getAllAndOverride<Array<UserRole | string>>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (roles && roles.length && !roles.some(required => roleSatisfies(normalizeEffectiveRole(String(required)), effectiveRoles))) {
      throw new ForbiddenException('Insufficient role');
    }

    // Fine-grained Permission check — one resolver is shared with the
    // impersonation-session validator, so a permission cannot grant session
    // creation and then fail solely because the actor uses a custom role.
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (requiredPermissions && requiredPermissions.length) {
      const userPermissions = await resolveEffectivePermissions(this.connection, payload);
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
