import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Permission } from './permissions';
import { hasEffectivePermission } from './effective-permissions';

function role(value: unknown): string {
  const valueString = String(value || '').trim().toLowerCase();
  const aliases: Record<string, string> = { laboratory: 'lab', radiology_center: 'radiology', hospital_admin: 'hospital_admin', pharmacy: 'pharmacy', pharmacist: 'pharmacist', homecare: 'home_care', nursing: 'nursing', nurse: 'nurse' };
  return aliases[valueString] || valueString;
}

@Injectable()
export class ImpersonationSessionService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async validate(payload: any) {
    const sessionId = String(payload?.impersonation_session_id || '');
    if (!sessionId || payload?.scope !== 'impersonation') throw new UnauthorizedException('impersonation_session_required');
    const session: any = await this.connection.collection('impersonation_sessions').findOne({ id: sessionId });
    if (!session) throw new UnauthorizedException('impersonation_session_not_found');
    const now = new Date();
    if (session.status !== 'active') throw new ForbiddenException(`impersonation_session_${session.status}`);
    const expiresAt = session.expiresAt instanceof Date ? session.expiresAt : new Date(session.expiresAt);
    if (expiresAt.getTime() <= now.getTime()) {
      await this.connection.collection('impersonation_sessions').updateOne({ id: sessionId, status: 'active' }, { $set: { status: 'expired', expired_at: now, updatedAt: now } });
      throw new ForbiddenException('impersonation_session_expired');
    }
    if (String(session.target_user_id) !== String(payload.id || payload.sub) || role(session.target_role) !== role(payload.role)) {
      throw new UnauthorizedException('impersonation_target_mismatch');
    }
    const impersonator: any = await this.connection.collection('users').findOne({ id: session.impersonator_id }, { projection: { id: 1, role: 1, active: 1, suspended: 1, custom_role_keys: 1, permissions: 1 } });
    if (!impersonator || impersonator.active === false || impersonator.suspended === true) throw new ForbiddenException('impersonator_not_active');
    // Use the same static-role, custom-role, and approved-grant resolver as
    // JwtAuthGuard. A session must not be created successfully and then fail
    // only because a valid actor has a custom role rather than a static role.
    const hasPolicy = await hasEffectivePermission(this.connection, impersonator, Permission.USER_IMPERSONATE);
    if (!hasPolicy) throw new ForbiddenException('impersonator_permission_revoked');
    return { session, impersonator };
  }
}
