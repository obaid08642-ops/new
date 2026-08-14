import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ProviderOperator, ProviderAccount, OperatorStatus, ProviderAuditLog } from '../schemas';
import { OperatorRole, OperatorPermission, DEFAULT_PERMISSIONS_BY_ROLE } from '../provider.enums';
import { ProviderMailerService } from './provider-mailer.service';
import { ProviderOperatorRepository } from "./repositories/provideroperator.repository";
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";

@Injectable()
export class ProviderOperatorsService {
  constructor(
    @Inject('ProviderOperatorRepository') private ops: ProviderOperatorRepository,
    @Inject('ProviderAccountRepository') private accounts: ProviderAccountRepository,
    @Inject('ProviderAuditLogRepository') private audit: ProviderAuditLogRepository,
    private readonly mailer: ProviderMailerService,
  ) {}

  async list(user: any) {
    return this.ops.find({ provider_account_id: user.id }, { password_hash: 0, invite_token: 0 }).sort({ createdAt: -1 });
  }

  async invite(user: any, body: any) {
    const email = (body.email || '').toLowerCase().trim();
    if (!email || !email.includes('@')) throw new BadRequestException('invalid email');
    if (!Object.values(OperatorRole).includes(body.role)) throw new BadRequestException('invalid role');
    if (body.role === OperatorRole.OWNER) throw new BadRequestException('cannot invite as OWNER');
    const existing = await this.ops.findOne({ provider_account_id: user.id, email });
    if (existing) throw new ConflictException('operator with this email already exists');
    const token = crypto.randomBytes(32).toString('hex');
    const perms = Array.isArray(body.permissions) && body.permissions.length ? body.permissions.filter((p: any) => Object.values(OperatorPermission).includes(p)) : DEFAULT_PERMISSIONS_BY_ROLE[body.role as OperatorRole];
    const op = await this.ops.create({ provider_account_id: user.id, email, full_name: body.full_name, phone: body.phone, role: body.role, permissions: perms, status: OperatorStatus.INVITED, invite_token: token, invite_token_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000) });
    // Send invite
    const acceptUrl = `${process.env.PROVIDER_APP_BASE_URL || 'https://nabd.app/provider'}/operators/accept?token=${token}&email=${encodeURIComponent(email)}`;
    await this.mailer.send({ to: email, subject: 'دعوة للانضمام إلى فريق مقدم الخدمة على نبض', text: `لقد تمت دعوتك للانضمام إلى فريق مقدم خدمة على نبض.\nالدور: ${body.role}\n\nاضغط الرابط التالي لإتمام إنشاء حسابك:\n${acceptUrl}\n\n(الرابط صالح لمدة 72 ساعة)`, tag: 'operator_invite' });
    await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'operator.invited', target: { collection: 'provider_operators', id: op.id }, after: { email, role: op.role } });
    return { id: op.id, email: op.email, role: op.role, status: op.status, permissions: op.permissions, invite_token_log_only: token /* visible only in non-prod when LOG_ONLY */ };
  }

  async acceptInvite(body: { token: string; email: string; full_name?: string; phone?: string; password: string }) {
    if (!body.token || !body.email || !body.password) throw new BadRequestException('token/email/password required');
    if (body.password.length < 8) throw new BadRequestException('password too short');
    const op = await this.ops.findOne({ email: body.email.toLowerCase().trim(), invite_token: body.token, status: OperatorStatus.INVITED });
    if (!op) throw new NotFoundException('invalid or expired invite');
    if (op.invite_token_expires_at && op.invite_token_expires_at.getTime() < Date.now()) throw new BadRequestException('invite expired');
    op.password_hash = await bcrypt.hash(body.password, 10);
    op.full_name = body.full_name || op.full_name;
    op.phone = body.phone || op.phone;
    op.status = OperatorStatus.ACTIVE;
    op.accepted_at = new Date();
    op.invite_token = undefined as any; op.invite_token_expires_at = undefined as any;
    await op.save();
    await this.audit.create({ provider_account_id: op.provider_account_id, actor_id: op.id, actor_role: 'operator', action: 'operator.accepted', target: { collection: 'provider_operators', id: op.id } });
    return { id: op.id, status: op.status, role: op.role };
  }

  async update(user: any, id: string, patch: any) {
    const op = await this.ops.findOne({ id, provider_account_id: user.id });
    if (!op) throw new NotFoundException();
    if (op.role === OperatorRole.OWNER) throw new ForbiddenException('cannot modify OWNER');
    if (patch.role && Object.values(OperatorRole).includes(patch.role) && patch.role !== OperatorRole.OWNER) { op.role = patch.role; op.permissions = DEFAULT_PERMISSIONS_BY_ROLE[patch.role as OperatorRole]; }
    if (Array.isArray(patch.permissions)) op.permissions = patch.permissions.filter((p: any) => Object.values(OperatorPermission).includes(p));
    if (patch.full_name !== undefined) op.full_name = patch.full_name;
    if (patch.phone !== undefined) op.phone = patch.phone;
    await op.save();
    await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'operator.updated', target: { collection: 'provider_operators', id: op.id }, after: { role: op.role } });
    return op;
  }

  async disable(user: any, id: string, reason?: string) {
    const op = await this.ops.findOne({ id, provider_account_id: user.id });
    if (!op) throw new NotFoundException();
    if (op.role === OperatorRole.OWNER) throw new ForbiddenException('cannot disable OWNER');
    op.status = OperatorStatus.DISABLED; op.disabled_at = new Date(); op.disabled_by = user.id; op.disabled_reason = reason;
    await op.save();
    await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'operator.disabled', target: { collection: 'provider_operators', id: op.id } });
    return op;
  }

  async enable(user: any, id: string) {
    const op = await this.ops.findOne({ id, provider_account_id: user.id });
    if (!op) throw new NotFoundException();
    op.status = OperatorStatus.ACTIVE; op.disabled_at = undefined as any; op.disabled_by = undefined as any; op.disabled_reason = undefined as any;
    await op.save();
    return op;
  }

  async revoke(user: any, id: string) {
    const op = await this.ops.findOne({ id, provider_account_id: user.id });
    if (!op) throw new NotFoundException();
    if (op.role === OperatorRole.OWNER) throw new ForbiddenException('cannot revoke OWNER');
    op.status = OperatorStatus.REVOKED;
    await op.save();
    return { ok: true };
  }
}
