import { Injectable, BadRequestException, ConflictException, NotFoundException, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ProviderAccount, ProviderProfile, ProviderAuditLog } from '../schemas';
import { ProviderAccountStatus, ProviderType, REQUIRED_DOCS_BY_PROVIDER_TYPE, PROVIDER_STATUS_TRANSITIONS } from '../provider.enums';
import { ProviderOtpService } from './provider-otp.service';
import { OtpPurpose } from '../schemas';
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";
import { ProviderSessionRepository } from "./repositories/providersession.repository";
import * as crypto from 'crypto';

@Injectable()
export class ProviderAuthService {
  private logger = new Logger('ProviderAuth');
  constructor(
    @Inject('ProviderAccountRepository') private accounts: ProviderAccountRepository,
    @Inject('ProviderAccountProfileRepository') private profiles: ProviderAccountProfileRepository,
    @Inject('ProviderAuditLogRepository') private audit: ProviderAuditLogRepository,
    @Inject('ProviderSessionRepository') private sessions: ProviderSessionRepository,
    private readonly otp: ProviderOtpService,
    private readonly jwt: JwtService,
  ) {}

  private signToken(a: ProviderAccount, profile?: ProviderProfile | null) {
    return this.jwt.sign({
      sub: a.id,
      id: a.id,
      role: 'provider',
      provider_type: a.provider_type,
      scope: 'provider',
      provider_account_id: a.id,
      provider_profile_id: profile?.id,
    });
  }
  private publicAccount(a: ProviderAccount) {
    return { id: a.id, email: a.email, provider_type: a.provider_type, status: a.status, email_verified: a.email_verified, onboarding_progress: a.onboarding_progress };
  }
  private validateEmail(email: string) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('invalid email');
  }
  private validatePassword(p: string) {
    if (!p || p.length < 8) throw new BadRequestException('password must be at least 8 characters');
    if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) throw new BadRequestException('password must contain letters and numbers');
  }

  async register(input: { email: string; password: string; confirm_password: string; provider_type: ProviderType; meta?: any }) {
    this.validateEmail(input.email);
    this.validatePassword(input.password);
    if (input.password !== input.confirm_password) throw new BadRequestException('passwords do not match');
    if (!Object.values(ProviderType).includes(input.provider_type)) throw new BadRequestException('invalid provider_type');
    const email = input.email.toLowerCase().trim();
    const exists = await this.accounts.findOne({ email });
    if (exists) throw new ConflictException('email already registered');
    const password_hash = await bcrypt.hash(input.password, 10);
    const acc = await this.accounts.create({ email, password_hash, provider_type: input.provider_type, status: ProviderAccountStatus.EMAIL_UNVERIFIED, status_history: [{ from: '', to: ProviderAccountStatus.EMAIL_UNVERIFIED, by_user_id: 'system', by_role: 'system', at: new Date() }] });
    await this.profiles.create({
      account_id: acc.id,
      user_id: acc.id,
      provider_type: input.provider_type,
      type: input.provider_type,
      status: 'pending',
    });
    await this.audit.create({ provider_account_id: acc.id, actor_id: acc.id, actor_role: 'provider', action: 'auth.register', target: { collection: 'provider_accounts', id: acc.id } });
    const otpRes = await this.otp.issue(email, OtpPurpose.EMAIL_VERIFICATION, { ip: input.meta?.ip, ua: input.meta?.ua, account_id: acc.id });
    return { account: this.publicAccount(acc), otp: otpRes, required_documents: REQUIRED_DOCS_BY_PROVIDER_TYPE[input.provider_type] };
  }

  async login(input: { email: string; password: string; meta?: any }) {
    const email = (input.email || '').toLowerCase().trim();
    const a = await this.accounts.findOne({ email });
    if (!a) throw new UnauthorizedException('invalid credentials');
    if (a.locked_until && a.locked_until.getTime() > Date.now()) throw new UnauthorizedException('account temporarily locked — too many failed attempts');
    const ok = await bcrypt.compare(input.password, a.password_hash);
    if (!ok) {
      a.failed_login_attempts = (a.failed_login_attempts || 0) + 1;
      if (a.failed_login_attempts >= 5) { a.locked_until = new Date(Date.now() + 15 * 60 * 1000); a.failed_login_attempts = 0; }
      await a.save();
      throw new UnauthorizedException('invalid credentials');
    }
    a.failed_login_attempts = 0; a.locked_until = undefined as any; a.last_login_at = new Date(); await a.save();
    await this.audit.create({ provider_account_id: a.id, actor_id: a.id, actor_role: 'provider', action: 'auth.login', meta: { ip: input.meta?.ip, device: input.meta?.device_identifier } });
    
    // Create new session
    const refresh_token = crypto.randomBytes(40).toString('hex');
    const refresh_token_hash = await bcrypt.hash(refresh_token, 10);
    const session = await this.sessions.create({
      provider_account_id: a.id,
      device_identifier: input.meta?.device_identifier || 'unknown',
      refresh_token_hash,
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    const p = await this.profiles.findOne({ account_id: a.id });
    const profileData = p ? p.toObject() : null;

    return { 
      access_token: this.signToken(a, p),
      refresh_token,
      session_id: session.id,
      provider_id: a.id,
      provider_type: a.provider_type,
      role: 'provider',
      permissions: ['*'],
      profile_status: a.status,
      account: this.publicAccount(a),
      profile: profileData
    };
  }

  async refresh(input: { refresh_token: string; device_identifier: string; session_id: string; meta?: any }) {
    const session = await this.sessions.findOne({ id: input.session_id, status: 'active' });
    if (!session) {
      this.logger.warn(`Refresh failed: Session ${input.session_id} not found or revoked`);
      throw new UnauthorizedException('invalid session');
    }

    if (session.device_identifier !== input.device_identifier) {
      await this.sessions.model.updateOne({ id: input.session_id }, { status: 'revoked' });
      await this.audit.create({ provider_account_id: session.provider_account_id, actor_id: 'system', actor_role: 'system', action: 'auth.session_revoked', meta: { reason: 'device_mismatch' } });
      throw new UnauthorizedException('device mismatch');
    }

    if (new Date() > session.expires_at) {
      await this.sessions.model.updateOne({ id: input.session_id }, { status: 'revoked' });
      throw new UnauthorizedException('session expired');
    }

    const ok = await bcrypt.compare(input.refresh_token, session.refresh_token_hash);
    if (!ok) {
      await this.sessions.model.updateOne({ id: input.session_id }, { status: 'revoked' });
      throw new UnauthorizedException('invalid refresh token');
    }

    const a = await this.accounts.findOne({ id: session.provider_account_id });
    if (!a) throw new UnauthorizedException('account not found');

    // Strict Status Checks
    if (a.locked_until && a.locked_until.getTime() > Date.now()) throw new UnauthorizedException('account locked');
    const invalidStatuses = [ProviderAccountStatus.SUSPENDED, ProviderAccountStatus.REJECTED];
    if (invalidStatuses.includes(a.status)) throw new UnauthorizedException(`account ${a.status.toLowerCase()}`);

    // Refresh Token Rotation
    const new_refresh_token = crypto.randomBytes(40).toString('hex');
    session.refresh_token_hash = await bcrypt.hash(new_refresh_token, 10);
    session.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await session.save();

    await this.audit.create({ provider_account_id: a.id, actor_id: a.id, actor_role: 'provider', action: 'auth.refresh', meta: { ip: input.meta?.ip, device: input.device_identifier } });

    const p = await this.profiles.findOne({ account_id: a.id });
    const profileData = p ? p.toObject() : null;

    return { 
      access_token: this.signToken(a, p),
      refresh_token: new_refresh_token,
      provider_id: a.id,
      provider_type: a.provider_type,
      role: 'provider',
      permissions: ['*'],
      profile_status: a.status,
      account: this.publicAccount(a),
      profile: profileData
    };
  }

  async logout(input: { session_id: string; meta?: any }) {
    await this.sessions.model.updateOne({ id: input.session_id }, { status: 'revoked' });
    const session = await this.sessions.findOne({ id: input.session_id });
    if (session) {
      await this.audit.create({ provider_account_id: session.provider_account_id, actor_id: session.provider_account_id, actor_role: 'provider', action: 'auth.logout', meta: { ip: input.meta?.ip } });
    }
    return { ok: true };
  }

  async sendOtp(input: { email: string; purpose: OtpPurpose; meta?: any }) {
    return this.otp.issue(input.email, input.purpose, { ip: input.meta?.ip, ua: input.meta?.ua });
  }

  async verifyEmail(input: { email: string; code: string; meta?: any }) {
    const a = await this.accounts.findOne({ email: input.email.toLowerCase().trim() });
    if (!a) throw new NotFoundException();
    await this.otp.verify(input.email, OtpPurpose.EMAIL_VERIFICATION, input.code, { ip: input.meta?.ip, ua: input.meta?.ua, account_id: a.id });
    if (!a.email_verified) {
      a.email_verified = true; a.email_verified_at = new Date();
      const allowed = PROVIDER_STATUS_TRANSITIONS[a.status] || [];
      if (allowed.includes(ProviderAccountStatus.EMAIL_VERIFIED)) {
        a.status_history.push({ from: a.status, to: ProviderAccountStatus.EMAIL_VERIFIED, by_user_id: a.id, by_role: 'provider', at: new Date() });
        a.status = ProviderAccountStatus.EMAIL_VERIFIED;
      }
      await a.save();
    }
    return { account: this.publicAccount(a), token: this.signToken(a) };
  }

  async forgotPassword(input: { email: string; meta?: any }) {
    const a = await this.accounts.findOne({ email: input.email.toLowerCase().trim() });
    // Always return a generic OK to prevent email enumeration
    if (!a) return { ok: true };
    await this.otp.issue(a.email, OtpPurpose.PASSWORD_RESET, { ip: input.meta?.ip, ua: input.meta?.ua, account_id: a.id });
    return { ok: true };
  }

  async resetPassword(input: { email: string; code: string; new_password: string; meta?: any }) {
    this.validatePassword(input.new_password);
    const a = await this.accounts.findOne({ email: input.email.toLowerCase().trim() });
    if (!a) throw new NotFoundException();
    await this.otp.verify(input.email, OtpPurpose.PASSWORD_RESET, input.code, { ip: input.meta?.ip, ua: input.meta?.ua, account_id: a.id });
    a.password_hash = await bcrypt.hash(input.new_password, 10);
    a.failed_login_attempts = 0; a.locked_until = undefined as any;
    await a.save();
    await this.audit.create({ provider_account_id: a.id, actor_id: a.id, actor_role: 'provider', action: 'auth.password_reset' });
    return { account: this.publicAccount(a), token: this.signToken(a) };
  }

  async me(user: any) {
    const a = await this.accounts.findOne({ id: user.id });
    if (!a) throw new NotFoundException();
    const p = await this.profiles.findOne({ account_id: a.id });
    return { account: this.publicAccount(a), profile: p?.toObject(), required_documents: REQUIRED_DOCS_BY_PROVIDER_TYPE[a.provider_type] };
  }
}
