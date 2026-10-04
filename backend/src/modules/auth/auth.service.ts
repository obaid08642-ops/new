import { Injectable, BadRequestException, UnauthorizedException, ConflictException, GoneException, ForbiddenException, Inject, HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { escapeHtml } from '../../common/html-escape';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createPublicKey, KeyObject } from 'crypto';
import * as nodemailer from 'nodemailer';
import { Optional } from '@nestjs/common';
import { PushService } from '../push/push.module';
import { MailService } from '../mail/mail.module';
import { SmsService } from '../sms/sms.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserDocument } from '../../schemas/user.schema';
import { PatientProfile, PatientProfileDocument } from '../../schemas/patient-profile.schema';
import { UserRole } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { UserRepository } from "./repositories/user.repository";
import { PatientProfileRepository } from "./repositories/patientprofile.repository";
import { RedisService } from '../redis/redis.service';
import { PasskeyService } from './passkey.service';
import { DeviceTrustService } from './device-trust.service';
import { AdminSessionService } from './admin-session.service';
import { revokeAllCredentialSessions, revokeRedisRefreshSessions, RevocationResult } from '../../common/credential-revocation';

@Injectable()
export class AuthService {
  // M0-01: hardcoded admin seeding removed from boot — use scripts/seed-admin.ts instead.
  // M0-03: OTPs are now stored in Redis (TTL-based) instead of an in-memory Map,
  // so they survive restarts and work across multiple instances.

  private readonly OTP_TTL_SECONDS = 5 * 60; // 5 minutes
  private readonly OTP_MAX_VERIFY_ATTEMPTS = 5;
  private readonly PATIENT_OTP_TTL_SECONDS = 5 * 60;
  private readonly PATIENT_EXCHANGE_TTL_SECONDS = 60;
  private readonly PATIENT_OTP_LOCK_TTL_SECONDS = 15 * 60;

  constructor(
    @Inject('UserRepository') private userModel: UserRepository,
    @Inject('PatientProfileRepository') private patientModel: PatientProfileRepository,
    private jwt: JwtService,
    private events: EventEmitter2,
    private redisService: RedisService,
    @Optional() private passkeys?: PasskeyService,
    @Optional() private deviceTrust?: DeviceTrustService,
    @Optional() private adminDevices?: any,
    @Optional() private adminSession?: AdminSessionService,
    @Optional() private push?: PushService,
    @Optional() private mail?: MailService,
    @Optional() private sms?: SmsService,
  ) {}

  signToken(user: any, deviceId?: string) {
    const accessToken = this.jwt.sign(
      { sub: user.id, id: user.id, role: user.role, phone: user.phone, is_guest: !!user.is_guest, tv: Number(user.token_version ?? 0), ...(deviceId ? { dev: deviceId.slice(0, 32) } : {}) },
      { expiresIn: '1h' } // Short-lived access token
    );
    // Refresh token carries a unique session id (jti) — tracked in Redis so
    // rotation can revoke the previous token and detect replay attacks.
    const jti = require('crypto').randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: user.id, type: 'refresh', jti },
      { expiresIn: '14d' }
    );
    this.storeRefreshSession(user.id, jti, deviceId).catch(() => {});
    return { accessToken, refreshToken };
  }

  /** Persist the refresh session (14d TTL matches token life), device-bound. */
  private async storeRefreshSession(userId: string, jti: string, deviceId?: string) {
    try {
      const client = (this.redisService as any).getClient?.();
      if (!client) return;
      await client.set(`refresh:${jti}`, JSON.stringify({ u: userId, d: deviceId || null }), 'EX', 14 * 24 * 3600);
      await client.sadd(`refresh_user:${userId}`, jti);
      await client.expire(`refresh_user:${userId}`, 30 * 24 * 3600);
    } catch { /* session store failure must not break login */ }
  }

  async refreshToken(token: string, deviceId?: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type');

    // Replay/rotation enforcement: the jti must still be an active session
    const client = (this.redisService as any).getClient?.();
    let boundDevice: string | null = null;
    if (client && payload.jti) {
      const raw = await client.get(`refresh:${payload.jti}`);
      if (!raw) {
        // Reuse of a rotated/unknown token — possible theft: kill the whole family
        if (payload.sub) await this.revokeAllUserSessions(payload.sub).catch(() => {});
        throw new UnauthorizedException('refresh_token_reused_or_revoked');
      }
      try { boundDevice = JSON.parse(raw).d || null; } catch { boundDevice = null; }
      // Device binding: a token minted for device A must not refresh on device B
      if (boundDevice && deviceId && boundDevice !== deviceId) {
        if (payload.sub) await this.revokeAllUserSessions(payload.sub).catch(() => {});
        throw new UnauthorizedException('refresh_token_device_mismatch');
      }
      // Rotate: revoke the presented token immediately
      await client.del(`refresh:${payload.jti}`);
      if (payload.sub) await client.srem(`refresh_user:${payload.sub}`, payload.jti);
    }

    const u = await this.userModel.findOne({ id: payload.sub });
    if (!u || u.active === false) throw new UnauthorizedException('User not found or disabled');
    return this.signToken(u, boundDevice || deviceId);
  }

  /** Revoke every refresh session of a user (logout-all / theft response). */
  async revokeAllUserSessions(userId: string) {
    const client = (this.redisService as any).getClient?.();
    if (!client) return { ok: true };
    const revoked = await revokeRedisRefreshSessions(client, userId);
    return { ok: true, revoked };
  }

  /**
   * P3.0a: after users.<userId>'s password changed, end EVERY session derived
   * from it (access + refresh, patient + linked provider). `bumpUser: false`
   * when the caller already $inc'ed users.token_version with the new hash.
   */
  async revokeAfterCredentialChange(userId: string, opts: { bumpUser?: boolean } = {}): Promise<RevocationResult> {
    const db = (this.userModel as any).model?.db;
    const client = (this.redisService as any).getClient?.();
    if (!db) {
      const refresh = await revokeRedisRefreshSessions(client, userId);
      return { refresh_sessions_revoked: refresh, provider_accounts: [], provider_sessions_revoked: 0 };
    }
    return revokeAllCredentialSessions(db, client, userId, opts);
  }

  /**
   * P3.0a: revoke everything, then mint a fresh pair for the device that made
   * the change so the user stays signed in there (and only there).
   */
  async rotateSessionsAfterPasswordChange(userId: string, deviceId?: string) {
    await this.revokeAfterCredentialChange(userId, { bumpUser: false });
    const u = await this.userModel.findOne({ id: userId });
    if (!u) throw new UnauthorizedException('User not found or disabled');
    const tokens = this.signToken(u, deviceId);
    await this.storeRefreshSessionFromToken(tokens.refreshToken, u.id, deviceId);
    return tokens;
  }

  /** signToken stores its refresh session fire-and-forget; await it when the caller must be able to refresh right away. */
  private async storeRefreshSessionFromToken(refreshToken: string, userId: string, deviceId?: string) {
    try {
      const jti = (this.jwt.decode(refreshToken) as any)?.jti;
      if (jti) await this.storeRefreshSession(userId, jti, deviceId);
    } catch { /* same contract as signToken: store failure never breaks the response */ }
  }

  async logoutAllDevices(userId: string) {
    // Real revocation: kill every refresh session for this user
    await this.revokeAllUserSessions(userId).catch(() => {});
    this.events.emit('USER_LOGGED_OUT_ALL', { user_id: userId });
    return { ok: true, message: 'Logged out from all devices' };
  }

  async recordComplianceConsent(userId: string, documentType: string, version: string) {
    // We update a consent log array inside the user's document
    await this.userModel.updateOne(
      { id: userId },
      { $push: { "legal_consents": { policy_id: documentType, version, accepted_at: new Date() } } }
    );
  }

  /** Reject non-string identifiers/credentials (NoSQL-injection hardening). */
  private static assertString(v: unknown, field: string): asserts v is string {
    if (typeof v !== 'string' || !v.trim()) throw new BadRequestException(`invalid ${field}`);
  }

  private normalizeOtpIdentifier(identifier: string) {
    return identifier.trim().toLowerCase();
  }

  private otpKey(identifier: string) {
    return `auth:otp:login-2fa:${this.normalizeOtpIdentifier(identifier)}`;
  }

  private otpIssueRateKey(identifier: string) {
    return `auth:otp:issue:${this.normalizeOtpIdentifier(identifier)}`;
  }

  private otpVerifyRateKey(identifier: string) {
    return `auth:otp:verify:${this.normalizeOtpIdentifier(identifier)}`;
  }

  /**
   * F34 channel policy. Delivers the OTP on every working channel, most
   * direct first: SMS for phone identifiers (Taqnyat via SmsService, only
   * when SMS_ENABLED), then push (best-effort), then email (the identifier
   * itself, or the account email for phone identifiers). Returns the list of
   * channels that accepted the message. Never throws — callers decide.
   */
  private async deliverOtp(user: any, identifier: string, code: string, isEmailIdentifier: boolean): Promise<string[]> {
    const delivered: string[] = [];
    if (!isEmailIdentifier && user?.phone) {
      try {
        if (await this.sms?.sendOtp(user.phone, code)) delivered.push('sms');
      } catch { /* fall through to push/email */ }
    }
    if (user?.id) try {
      const r: any = await this.push?.sendTemplated(
        user.id,
        'push.otp.title',
        'push.otp.body',
        { kind: 'otp' },
        { code },
      );
      if (r && Number(r.sent) > 0) delivered.push('push');
    } catch { /* push must never break OTP delivery */ }
    const emailTarget = isEmailIdentifier ? identifier : user?.email;
    if (emailTarget) {
      try {
        const r = await this.mail?.sendOtp(emailTarget, code);
        if (r?.ok) delivered.push('email');
      } catch { /* isolated per channel */ }
    }
    return delivered;
  }

  /** Redis marker left by a successful OTP verification (10 min, single-use by register). */
  private otpVerifiedKey(identifier: string) {
    return `auth:otp:verified:${this.normalizeOtpIdentifier(identifier)}`;
  }

  private patientOtpKey(identifier: string) {
    return `auth:otp:patient:${this.normalizeOtpIdentifier(identifier)}`;
  }

  private patientOtpIssueRateKey(identifier: string) {
    return `auth:otp:patient:issue:${this.normalizeOtpIdentifier(identifier)}`;
  }

  private patientOtpVerifyRateKey(identifier: string) {
    return `auth:otp:patient:verify:${this.normalizeOtpIdentifier(identifier)}`;
  }

  private patientOtpLockKey(identifier: string) {
    return `auth:otp:patient:lock:${this.normalizeOtpIdentifier(identifier)}`;
  }

  private patientExchangeKey(token: string) {
    return `auth:session:exchange:${token}`;
  }

  private passwordResetKey(token: string) {
    return `auth:password:reset:${token}`;
  }

  private opaqueOtpResponse(identifier: string) {
    return {
      otp_sent: true,
      channel: 'email',
      expires_in: this.PATIENT_OTP_TTL_SECONDS,
    } as const;
  }

  /**
   * Patient-web OTP request bridge. It deliberately returns the same bounded
   * DTO for an unknown identifier to prevent account enumeration. The OTP and
   * its bcrypt hash are written only when an active account actually exists.
   */
  async requestPatientOtp(identifier: string) {
    AuthService.assertString(identifier, 'identifier');
    const normalized = this.normalizeOtpIdentifier(identifier);
    const rate = await this.redisService.checkRateLimit(
      this.patientOtpIssueRateKey(normalized),
      3,
      10 * 60,
    );
    if (!rate.allowed) {
      throw new HttpException({ message: 'otp_rate_limited', code: 'otp_rate_limited', statusCode: HttpStatus.TOO_MANY_REQUESTS }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.userModel.findOne(normalized.includes('@') ? { email: normalized } : { phone: normalized });
    if (!user || user.active === false) return this.opaqueOtpResponse(normalized);

    const code = require('crypto').randomInt(100000, 1000000).toString();
    await this.redisService.setJson(
      this.patientOtpKey(normalized),
      { code_hash: await bcrypt.hash(code, 12), user_id: user.id, attempts: 0 },
      this.PATIENT_OTP_TTL_SECONDS,
    );

    // F34: SMS first for phone identifiers (when enabled), then push, then
    // email. A phone-only user with SMS disabled and no email is no longer
    // told "sent" for a code that went nowhere.
    const delivered = await this.deliverOtp(user, normalized, code, normalized.includes('@'));
    if (!delivered.length) {
      throw new ServiceUnavailableException({ message: 'otp_channel_unavailable', code: 'otp_channel_unavailable' });
    }
    return this.opaqueOtpResponse(normalized);
  }

  /** Verifies a patient-web OTP and creates a short-lived one-time exchange token. */
  async verifyPatientOtp(identifier: string, code: string, deviceId?: string) {
    AuthService.assertString(identifier, 'identifier');
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new UnauthorizedException({ message: 'otp_invalid', code: 'otp_invalid', statusCode: HttpStatus.UNAUTHORIZED });
    }
    const normalized = this.normalizeOtpIdentifier(identifier);
    if (await this.redisService.exists(this.patientOtpLockKey(normalized))) {
      throw new HttpException({ message: 'otp_locked', code: 'otp_locked', statusCode: HttpStatus.TOO_MANY_REQUESTS }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const rate = await this.redisService.checkRateLimit(
      this.patientOtpVerifyRateKey(normalized),
      this.OTP_MAX_VERIFY_ATTEMPTS,
      this.PATIENT_OTP_LOCK_TTL_SECONDS,
    );
    if (!rate.allowed) {
      await this.redisService.set(this.patientOtpLockKey(normalized), '1', this.PATIENT_OTP_LOCK_TTL_SECONDS);
      throw new HttpException({ message: 'otp_locked', code: 'otp_locked', statusCode: HttpStatus.TOO_MANY_REQUESTS }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const key = this.patientOtpKey(normalized);
    const entry = await this.redisService.getJson<{ code_hash?: string; user_id?: string; attempts?: number }>(key);
    if (!entry?.code_hash || !entry.user_id) {
      throw new GoneException({ message: 'otp_expired', code: 'otp_expired', statusCode: HttpStatus.GONE });
    }
    const valid = await bcrypt.compare(code, entry.code_hash);
    if (!valid) {
      const attempts = (entry.attempts || 0) + 1;
      if (attempts >= this.OTP_MAX_VERIFY_ATTEMPTS) {
        await this.redisService.del(key);
        await this.redisService.set(this.patientOtpLockKey(normalized), '1', this.PATIENT_OTP_LOCK_TTL_SECONDS);
        throw new HttpException({ message: 'otp_locked', code: 'otp_locked', statusCode: HttpStatus.TOO_MANY_REQUESTS }, HttpStatus.TOO_MANY_REQUESTS);
      }
      const ttl = await this.redisService.ttl(key);
      await this.redisService.setJson(key, { ...entry, attempts }, ttl > 0 ? ttl : this.PATIENT_OTP_TTL_SECONDS);
      throw new UnauthorizedException({ message: 'otp_invalid', code: 'otp_invalid', statusCode: HttpStatus.UNAUTHORIZED });
    }

    await this.redisService.del(key);
    await this.redisService.del(`ratelimit:${this.patientOtpVerifyRateKey(normalized)}`);
    const exchangeToken = require('crypto').randomBytes(32).toString('base64url');
    await this.redisService.setJson(
      this.patientExchangeKey(exchangeToken),
      { user_id: entry.user_id, device_id: deviceId || null },
      this.PATIENT_EXCHANGE_TTL_SECONDS,
    );
    return { exchange_token: exchangeToken, expires_in: this.PATIENT_EXCHANGE_TTL_SECONDS };
  }

  /**
   * Claims an exchange token with SET NX before reading it, preventing two
   * concurrent callers from turning the same OTP verification into sessions.
   */
  async exchangePatientSession(exchangeToken: string) {
    AuthService.assertString(exchangeToken, 'exchange_token');
    const key = this.patientExchangeKey(exchangeToken);
    const redis = this.redisService.getClient();
    const claimed = await redis.set(`${key}:claim`, '1', 'EX', this.PATIENT_EXCHANGE_TTL_SECONDS, 'NX');
    if (!claimed) {
      throw new UnauthorizedException({ message: 'exchange_token_invalid', code: 'exchange_token_invalid', statusCode: HttpStatus.UNAUTHORIZED });
    }
    const entry = await this.redisService.getJson<{ user_id?: string; device_id?: string | null }>(key);
    if (!entry?.user_id) {
      await redis.del(`${key}:claim`);
      throw new UnauthorizedException({ message: 'exchange_token_invalid', code: 'exchange_token_invalid', statusCode: HttpStatus.UNAUTHORIZED });
    }
    await this.redisService.del(key);
    const user = await this.userModel.findOne({ id: entry.user_id });
    if (!user || user.active === false) {
      throw new UnauthorizedException({ message: 'exchange_token_invalid', code: 'exchange_token_invalid', statusCode: HttpStatus.UNAUTHORIZED });
    }
    const tokens = this.signToken(user, entry.device_id || undefined);
    return { access_token: tokens.accessToken, refresh_token: tokens.refreshToken };
  }

  /** Password-reset request shares the opaque account-discovery behaviour of OTP. */
  async forgotPatientPassword(identifier: string) {
    AuthService.assertString(identifier, 'identifier');
    const normalized = this.normalizeOtpIdentifier(identifier);
    const rate = await this.redisService.checkRateLimit(`auth:password:forgot:${normalized}`, 3, 10 * 60);
    if (!rate.allowed) {
      throw new HttpException({ message: 'password_reset_rate_limited', code: 'password_reset_rate_limited', statusCode: HttpStatus.TOO_MANY_REQUESTS }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const user = await this.userModel.findOne(normalized.includes('@') ? { email: normalized } : { phone: normalized });
    if (!user || user.active === false) return { requested: true };
    const resetToken = require('crypto').randomBytes(32).toString('base64url');
    await this.redisService.setJson(this.passwordResetKey(resetToken), { user_id: user.id }, this.PATIENT_EXCHANGE_TTL_SECONDS);
    try {
      if (normalized.includes('@')) {
        await this.mail?.send(normalized, 'Password reset', `Your Nabd+ password-reset token is ${resetToken}. It expires in 60 seconds.`);
      } else if (user.email) {
        // SMS retired: reset link goes by email (Resend→SES).
        await this.mail?.send(user.email, 'Password reset', `Your Nabd+ password-reset token is ${resetToken}. It expires in 60 seconds.`);
      }
    } catch {
      // Do not disclose account state or the raw token in the HTTP response.
    }
    return { requested: true };
  }

  async resetPatientPassword(resetToken: string, newPassword: string) {
    AuthService.assertString(resetToken, 'reset_token');
    AuthService.assertString(newPassword, 'new_password');
    if (newPassword.length < 8) throw new BadRequestException({ message: 'password_too_short', code: 'password_too_short', statusCode: HttpStatus.BAD_REQUEST });
    const key = this.passwordResetKey(resetToken);
    const redis = this.redisService.getClient();
    const claimed = await redis.set(`${key}:claim`, '1', 'EX', this.PATIENT_EXCHANGE_TTL_SECONDS, 'NX');
    if (!claimed) throw new UnauthorizedException({ message: 'reset_token_invalid', code: 'reset_token_invalid', statusCode: HttpStatus.UNAUTHORIZED });
    const entry = await this.redisService.getJson<{ user_id?: string }>(key);
    if (!entry?.user_id) {
      await redis.del(`${key}:claim`);
      throw new UnauthorizedException({ message: 'reset_token_invalid', code: 'reset_token_invalid', statusCode: HttpStatus.UNAUTHORIZED });
    }
    await this.redisService.del(key);
    const user = await this.userModel.findOne({ id: entry.user_id });
    if (!user || user.active === false) throw new UnauthorizedException({ message: 'reset_token_invalid', code: 'reset_token_invalid', statusCode: HttpStatus.UNAUTHORIZED });
    user.password_hash = await bcrypt.hash(newPassword, 12);
    await user.save();
    // P3.0a: reset ends every session (access + refresh, patient + provider).
    await this.revokeAfterCredentialChange(user.id);
    return { reset: true };
  }

  /**
   * Contract V1 patient registration. This deliberately does not issue a
   * session token: the new account must complete the opaque OTP bridge first.
   */
  async registerPatientContract(data: {
    name: string;
    identifier: string;
    password: string;
    locale: string;
    consents: Array<{ policy_id: string; version: string }>;
  }) {
    AuthService.assertString(data?.name, 'name');
    AuthService.assertString(data?.identifier, 'identifier');
    AuthService.assertString(data?.password, 'password');
    AuthService.assertString(data?.locale, 'locale');
    if (!Array.isArray(data?.consents) || data.consents.length === 0) {
      throw new BadRequestException({ message: 'consents_required', code: 'consents_required', statusCode: HttpStatus.BAD_REQUEST });
    }

    const identifier = this.normalizeOtpIdentifier(data.identifier);
    const isEmail = identifier.includes('@');
    const seenPolicies = new Set<string>();
    const consents = data.consents.map((consent) => {
      AuthService.assertString(consent?.policy_id, 'consent.policy_id');
      AuthService.assertString(consent?.version, 'consent.version');
      const key = `${consent.policy_id}:${consent.version}`;
      if (seenPolicies.has(key)) {
        throw new BadRequestException({ message: 'duplicate_consent', code: 'duplicate_consent', statusCode: HttpStatus.BAD_REQUEST });
      }
      seenPolicies.add(key);
      // Registration consent is an acceptance by definition — the account cannot
      // be created without agreeing — so `accepted` is recorded explicitly rather
      // than left undefined, keeping the consent trail uniform with the PDPL
      // consent endpoint.
      return { policy_id: consent.policy_id.trim(), version: consent.version.trim(), accepted_at: new Date(), accepted: true };
    });

    const existing = await this.userModel.findOne(isEmail ? { email: identifier } : { phone: identifier });
    if (existing) {
      throw new ConflictException({ message: 'identifier_already_registered', code: 'identifier_already_registered', statusCode: HttpStatus.CONFLICT });
    }

    const user = await this.userModel.create({
      full_name: data.name.trim(),
      ...(isEmail ? { email: identifier } : { phone: identifier }),
      password_hash: await bcrypt.hash(data.password, 12),
      role: UserRole.PATIENT,
      preferred_lang: data.locale.trim(),
      legal_consents: consents,
    });
    await this.patientModel.create({
      user_id: user.id,
      full_name: user.full_name,
      ...(isEmail ? { email: identifier } : { phone: identifier }),
    });
    this.events.emit(EVENTS.USER_REGISTERED, { user_id: user.id, role: user.role });

    // The response remains minimal; requestPatientOtp emits the opaque delivery DTO.
    await this.requestPatientOtp(identifier);
    return { registered: true };
  }

  async register(data: { full_name: string; phone?: string; password: string; email?: string; role?: UserRole }) {
    if (data.email !== undefined) AuthService.assertString(data.email, 'email');
    if (data.phone !== undefined) AuthService.assertString(data.phone, 'phone');
    AuthService.assertString(data.password, 'password');
    if (!data.email && !data.phone) throw new BadRequestException('Email or phone is required');
    if (data.phone) {
      const exists = await this.userModel.findOne({ phone: data.phone });
      if (exists) throw new ConflictException('Phone already registered');
    }
    if (data.email) {
      const exists = await this.userModel.findOne({ email: data.email });
      if (exists) throw new ConflictException('Email already registered');
    }
    // F63: no account — and no tokens — without proven ownership of the phone
    // or email: either an OTP code verified inline, or a single-use marker
    // left by a prior /auth/verify-otp call. Otherwise 400 otp_required.
    const otpContacts = [
      ...(data.phone ? [this.normalizeOtpIdentifier(data.phone)] : []),
      ...(data.email ? [this.normalizeOtpIdentifier(data.email)] : []),
    ];
    let ownershipProven = false;
    const inlineCode = String((data as any).otp || '').trim();
    if (inlineCode && otpContacts.length) {
      let lastErr: any = null;
      for (const contact of otpContacts) {
        try { await this.verifyOtp(contact, inlineCode); ownershipProven = true; break; }
        catch (e) { lastErr = e; }
      }
      if (!ownershipProven) throw lastErr;
    } else {
      for (const contact of otpContacts) {
        const mark = await this.redisService.getJson(this.otpVerifiedKey(contact)).catch(() => null);
        if (mark) {
          await this.redisService.del(this.otpVerifiedKey(contact)).catch(() => {});
          ownershipProven = true;
          break;
        }
      }
    }
    if (!ownershipProven) {
      throw new BadRequestException({ message: 'otp_required', code: 'otp_required', statusCode: HttpStatus.BAD_REQUEST });
    }
    const hash = await bcrypt.hash(data.password, 12);
    // S6 privilege-escalation fix: public registration may ONLY create patient or
    // independently-onboarding provider accounts (which stay unverified until admin
    // approval). Staff/privileged roles (admin, finance, support, reception…) are
    // created exclusively by admins through the staff endpoints — never self-assigned.
    const SELF_REGISTERABLE: string[] = [
      UserRole.PATIENT, UserRole.DOCTOR, UserRole.PHARMACY, UserRole.HOSPITAL,
      UserRole.LAB, UserRole.RADIOLOGY, UserRole.HOME_CARE, UserRole.NURSING,
      UserRole.NURSE, UserRole.AMBULANCE, UserRole.PHYSIOTHERAPIST,
    ];
    const requestedRole = ((data.role as string) || UserRole.PATIENT) as UserRole;
    if (!SELF_REGISTERABLE.includes(requestedRole)) {
      throw new BadRequestException('role_not_self_registerable');
    }
    const u = await this.userModel.create({
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      password_hash: hash,
      role: requestedRole,
    });
    if (u.role === UserRole.PATIENT) {
      await this.patientModel.create({ user_id: u.id });
    }

    this.events.emit(EVENTS.USER_REGISTERED, { user_id: u.id, role: u.role });
    return { user: this.publicUser(u), token: this.signToken(u) };
  }

  async login(identifier: string, password: string, ctx?: { deviceToken?: string; ua?: string; ip?: string }) {
    AuthService.assertString(identifier, 'identifier');
    AuthService.assertString(password, 'password');
    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier.trim().toLowerCase() } : { phone: identifier };
    const u = await this.userModel.findOne(query);
    if (!u || !u.password_hash) {
      if (u) await this.adminLoginAlert(u, false, ctx); // C5: known account, bad secret
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) {
      await this.adminLoginAlert(u, false, ctx); // C5: failed admin login attempt
      throw new UnauthorizedException('Invalid credentials');
    }
    if (u.active === false) throw new UnauthorizedException('Account disabled');

    // Check 2FA requirement
    if (u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN) {
      // Trusted device fast-path: a device that already completed full 2FA
      // (and wasn't revoked) signs in with password only.
      if (this.deviceTrust && ctx?.deviceToken) {
        const trusted = await this.deviceTrust.validate(u.id, ctx.deviceToken, ctx.ip);
        if (trusted) {
          u.last_login_at = new Date();
          await u.save();
          this.events.emit(EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role, method: 'trusted_device' });
          await this.adminSession?.touch(u.id); // C5: idle window starts at login
          await this.adminLoginAlert(u, true, { ...ctx, deviceName: trusted.name }); // C5
          return {
            user: this.publicUser(u),
            token: this.signToken(u),
            trusted_device: true,
            device_name: trusted.name,
          };
        }
      }
      // C1: Passkey is MANDATORY for every admin/super_admin account.
      // Password is already verified above — the ONLY next step is the WebAuthn
      // assertion. No session token, no OTP fallback for admin roles.
      if (u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN) {
        if (!this.passkeys) throw new UnauthorizedException('passkey_not_available');
        const keyCount = await this.passkeys.countCredentials(u.id);
        if (keyCount === 0) {
          // Bootstrap: no passkey enrolled yet → email OTP so the owner can
          // sign in once and enroll the first device from the security page.
          // After the first key exists, OTP is never offered again.
          const contact = this.otpContact(u, identifier);
          await this.sendOtp(contact);
          return {
            requires_2fa: true,
            identifier: contact,
            message: 'OTP sent to your registered contact.',
            passkey_bootstrap: true,
          };
        }
        const options = await this.passkeys.startLogin(u);
        return {
          requires_passkey: true,
          identifier: u.email,
          passkey_options: options,
          message: 'Passkey verification required.',
        };
      }
      const contact = this.otpContact(u, identifier);
      await this.sendOtp(contact);
      return {
        requires_2fa: true,
        identifier: contact,
        message: 'OTP sent to your registered contact.'
      };
    }

    u.last_login_at = new Date();
    await u.save();
    this.events.emit(EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role });
    return { user: this.publicUser(u), token: this.signToken(u) };
  }

  async verify2fa(identifier: string, code: string, ctx?: { ua?: string; ip?: string; trust?: boolean }) {
    AuthService.assertString(identifier, 'identifier');
    AuthService.assertString(code, 'code');
    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier.trim().toLowerCase() } : { phone: identifier };
    const u = await this.userModel.findOne(query);
    if (!u) throw new UnauthorizedException('User not found');

    // Verify using the same identifier that received the OTP during login.
    // Login may be initiated with email while the OTP is sent to the user's phone
    // (or vice versa), so the submitted identifier is not always the OTP key.
    try {
      await this.verifyOtp(this.otpContact(u, identifier), code); // Will throw if invalid
    } catch (e) {
      await this.adminLoginAlert(u, false, ctx); // C5: failed OTP (admin only alerts)
      throw e;
    }
    await this.adminSession?.touch(u.id); // C5
    await this.adminLoginAlert(u, true, ctx); // C5

    u.last_login_at = new Date();
    await u.save();
    this.events.emit(EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role });

    const result: any = { user: this.publicUser(u), token: this.signToken(u) };

    // Admin accounts: trust this device (default on — the owner asked for his
    // iPhone + Mac to be approved) and alert by email about the new device.
    if (this.deviceTrust && (u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN)) {
      const { token, device } = await this.deviceTrust.issue(u.id, ctx?.ua, ctx?.ip);
      result.device_token = token;
      result.device = { id: device.id, name: device.name };
      await this.sendNewDeviceAlert(u, device, ctx?.ip);
    }
    return result;
  }

  /**
   * Complete a Passkey (WebAuthn) login — the mandatory second factor for the
   * designated admin account. Issues a session ONLY after the authenticator's
   * digital signature has been cryptographically verified against the
   * registered public key.
   */
  async completePasskeyLogin(identifier: string, response: any, ctx?: { ua?: string; ip?: string; deviceId?: string; deviceName?: string }) {
    AuthService.assertString(identifier, 'identifier');
    if (!this.passkeys) throw new UnauthorizedException('passkey_not_available');
    const u = await this.userModel.findOne({ email: identifier.trim().toLowerCase() });
    if (!u || (u.role !== UserRole.SUPER_ADMIN && u.role !== UserRole.ADMIN)) {
      // Never reveal passkey state for other accounts
      throw new UnauthorizedException('Invalid credentials');
    }
    if (u.active === false) throw new UnauthorizedException('Account disabled');
    let ownerId: string;
    try {
      ownerId = await this.passkeys.finishLogin(response);
    } catch (e) {
      await this.adminLoginAlert(u, false, ctx); // C5: failed passkey assertion
      throw e;
    }
    if (ownerId !== u.id) {
      await this.adminLoginAlert(u, false, ctx);
      throw new UnauthorizedException('Invalid credentials');
    }
    u.last_login_at = new Date();
    await u.save();
    this.events.emit(EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role, method: 'passkey' });
    await this.adminSession?.touch(u.id); // C5: idle window starts at login
    await this.adminLoginAlert(u, true, ctx); // C5
    const result: any = { user: this.publicUser(u), token: this.signToken(u) };
    // C2: auto-enroll the presenting device into the admin allow-list on
    // successful passkey login (the passkey assertion proves possession). The
    // device is bound to the credential that was just verified, so removing that
    // passkey revokes the device — a token replayed without a live credential is
    // rejected by the guard even though the device id is enrolled.
    if (this.adminDevices && ctx?.deviceId) {
      await this.adminDevices.enroll(u.id, ctx.deviceId, ctx.ua, ctx.deviceName, response?.id);
    }
    if (this.deviceTrust) {
      const { token, device } = await this.deviceTrust.issue(u.id, ctx?.ua, ctx?.ip);
      result.device_token = token;
      result.device = { id: device.id, name: device.name };
      await this.sendNewDeviceAlert(u, device, ctx?.ip);
    }
    return result;
  }

  /** Email alert: a new/unknown device just completed full 2FA on an admin account. */
  private async sendNewDeviceAlert(u: any, device: any, ip?: string) {
    try {
      const to = (u.email || '').trim();
      if (!to || !this.mail) return;
      const when = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });
      await this.mail.send(
        to,
        'تنبيه أمني: تسجيل دخول من جهاز جديد — نَبْض',
        `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.9">
          <h2 style="color:#0E8FA3">تنبيه أمني — لوحة تحكم نبض</h2>
          <p>تم تسجيل الدخول إلى حساب الأدمن واعتماد جهاز جديد:</p>
          <ul>
            <li><b>الجهاز:</b> ${escapeHtml(device?.name || 'غير معروف')}</li>
            <li><b>المتصفح/النظام:</b> ${escapeHtml(device?.user_agent || '-')}</li>
            <li><b>عنوان IP:</b> ${escapeHtml(ip || '-')}</li>
            <li><b>الوقت:</b> ${when}</li>
          </ul>
          <p>إذا لم يكن هذا أنت، ادخل فورًا إلى <b>الأمان ومفاتيح الدخول</b> واحذف الجهاز وغيّر كلمة المرور.</p>
        </div>`,
      );
    } catch (e) {
      // Alert failure must never block a successful, fully-verified login
    }
  }

  /**
   * C5: instant alert (email + push) on every admin login and every failed
   * admin login attempt, with device, IP and time. Records the attempt for
   * the audit trail. Never throws.
   */
  private async adminLoginAlert(u: any, ok: boolean, ctx?: { ua?: string; ip?: string; deviceId?: string; deviceName?: string }) {
    try {
      if (!u || (u.role !== UserRole.SUPER_ADMIN && u.role !== UserRole.ADMIN)) return;
      await this.adminSession?.recordLoginAttempt(u.id, u.email, ok, ctx?.ip, ctx?.ua);
      const to = (u.email || '').trim();
      const when = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });
      const subject = ok ? 'تسجيل دخول إلى لوحة تحكم نبض — نَبْض' : 'تنبيه أمني: محاولة دخول فاشلة — نَبْض';
      const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.9">
          <h2 style="color:#0E8FA3">${ok ? 'تسجيل دخول — لوحة تحكم نبض' : 'محاولة دخول فاشلة — لوحة تحكم نبض'}</h2>
          <ul>
            <li><b>الحساب:</b> ${escapeHtml(u.email || '-')}</li>
            <li><b>الجهاز:</b> ${escapeHtml(ctx?.deviceName || 'غير معروف')}</li>
            <li><b>عنوان IP:</b> ${escapeHtml(ctx?.ip || '-')}</li>
            <li><b>الوقت:</b> ${when}</li>
          </ul>
          ${ok ? '' : '<p>إذا لم يكن هذا أنت، غيّر كلمة المرور فورًا.</p>'}
        </div>`;
      if (to && this.mail) await this.mail.send(to, subject, html).catch(() => {});
      try {
        const text = await this.push?.resolvePushText?.(
          'push.admin.login.title', 'push.admin.login.body',
          { email: u.email || '', ip: ctx?.ip || '', ok: ok ? '1' : '0' },
        );
        if (text && u.id) await this.push?.sendToUser?.(u.id, text.title, text.body, { kind: 'admin_login', ok });
      } catch { /* push is best-effort here */ }
    } catch {
      /* alerts must never break login */
    }
  }

  // ── Trusted devices (admin device management) ───────────────
  async listTrustedDevices(userId: string) {
    if (!this.deviceTrust) return [];
    return this.deviceTrust.list(userId);
  }

  async revokeTrustedDevice(userId: string, deviceId: string) {
    if (!this.deviceTrust) throw new BadRequestException('device_trust_unavailable');
    return this.deviceTrust.revoke(userId, deviceId);
  }

  async deviceHeartbeat(userId: string, deviceToken: string | undefined, ua?: string, ip?: string) {
    if (!this.deviceTrust) return { ok: false };
    return this.deviceTrust.heartbeat(userId, deviceToken, ua, ip);
  }

  async onlineDevices(userId: string) {
    if (!this.deviceTrust) return [];
    return this.deviceTrust.onlineSessions(userId);
  }

  /**
   * Device-bound guest identity — the SAME device always gets the SAME guest
   * (persistent across reinstalls of the session), so orders/cart/preferences
   * never fragment into throwaway accounts.
   */
  async guest(phone?: string, deviceId?: string) {
    const client = (this.redisService as any).getClient?.();

    // 1) Existing guest for this device? → reuse it
    if (deviceId && client) {
      const existingId = await client.get(`guest_device:${deviceId}`);
      if (existingId) {
        const existing = await this.userModel.findOne({ id: existingId });
        // Only a real guest row may be re-issued from an unauthenticated device id.
        // Once a guest converts, the binding must not mint tokens for that account.
        if (existing && existing.is_guest === true) {
          return { user: this.publicUser(existing), token: this.signToken(existing, deviceId) };
        }
      }
    }

    // 2) Create (or reuse by phone) the guest account
    // The phone is unverified input: reuse a row by phone only when it is a guest
    // row, and never attach a phone that already belongs to a registered account.
    const byPhone = phone ? await this.userModel.findOne({ phone }) : null;
    let u = byPhone && byPhone.is_guest === true ? byPhone : null;
    if (!u) {
      const guestPhone = phone && !byPhone ? phone : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      u = await this.userModel.create({
        full_name: 'Guest',
        phone: guestPhone,
        is_guest: true,
        role: UserRole.PATIENT,
      });
      await this.patientModel.create({ user_id: u.id });
    }

    // 3) Bind device → guest id permanently (90d rolling)
    if (deviceId && client) {
      await client.set(`guest_device:${deviceId}`, u.id, 'EX', 90 * 24 * 3600);
    }

    return { user: this.publicUser(u), token: this.signToken(u, deviceId) };
  }

  /** Re-point a guest's data to another account (used by the merge path). */
  private async migrateGuestData(fromUserId: string, toUserId: string) {
    const collections: Array<{ name: string; fields: string[] }> = [
      { name: 'orders', fields: ['patient_id', 'user_id'] },
      { name: 'carts', fields: ['user_id', 'patient_id'] },
      { name: 'appointments', fields: ['patient_id', 'patient_account_id'] },
      { name: 'pushtokens', fields: ['user_id'] },
      { name: 'pushengagements', fields: ['user_id'] },
      { name: 'notifications', fields: ['user_id'] },
      { name: 'search_queries', fields: ['user_id'] },
      { name: 'product_views', fields: ['user_id'] },
      { name: 'storage_objects', fields: ['owner_account_id'] },
    ];
    for (const c of collections) {
      for (const f of c.fields) {
        try {
          await (this.userModel.db as any).collection(c.name).updateMany(
            { [f]: fromUserId }, { $set: { [f]: toUserId } },
          );
        } catch { /* best-effort per collection */ }
      }
    }
    // Patient profile itself
    try {
      await this.patientModel.findOneAndUpdate({ user_id: fromUserId }, { $set: { user_id: toUserId } });
    } catch { /* ok if none */ }
  }

  async convertGuest(
    guestUserId: string,
    data: { full_name: string; phone: string; password: string; email?: string }
  ) {
    const guestUser = await this.userModel.findOne({ id: guestUserId });
    if (!guestUser) {
      throw new BadRequestException('Guest user not found');
    }
    if (!guestUser.is_guest) {
      throw new BadRequestException('User is already fully registered');
    }

    const existsPhone = await this.userModel.findOne({ phone: data.phone });
    if (existsPhone && existsPhone.id !== guestUserId) {
      throw new ConflictException('Phone already registered');
    }

    const existingUser = guestUser;
    
    if (data.email) {
      const existsEmail = await this.userModel.findOne({ email: data.email });
      if (existsEmail && existsEmail.id !== guestUserId) {
        // Knowing an email is not proof of owning the account: issuing its token
        // here was an account takeover. Merging guest data into an existing
        // account must first authenticate as that account, so refuse like the
        // phone check above.
        throw new ConflictException('Email already registered');
      }
    }

    if (existingUser.id === guestUserId) {
      const hash = await bcrypt.hash(data.password, 12);
      existingUser.full_name = data.full_name;
      existingUser.phone = data.phone;
      existingUser.email = data.email;
      existingUser.password_hash = hash;
      existingUser.is_guest = false;
      await existingUser.save();
      this.events.emit(EVENTS.USER_GUEST_CONVERTED, { user_id: existingUser.id });
    }
    
    return { user: this.publicUser(existingUser), token: this.signToken(existingUser) };
  }

  async me(userId: string) {
    const u = await this.userModel.findOne({ id: userId });
    if (!u) throw new UnauthorizedException('User not found');
    return this.publicUser(u);
  }

  publicUser(u: any) {
    const base: any = {
      id: u.id,
      full_name: u.full_name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      avatar_url: u.avatar_url,
      is_guest: u.is_guest,
    };
    if (u.role === 'admin' || u.role === 'super_admin') {
      base.device_lock_enabled = (u as any).device_lock_enabled === true;
    }
    return base;
  }

  async sendOtp(identifier: string, purpose?: string) {
    AuthService.assertString(identifier, 'identifier');
    const normalized = this.normalizeOtpIdentifier(identifier);
    const rateLimitKey = this.otpIssueRateKey(normalized);
    const maxAttempts = Number(process.env.OTP_ISSUE_LIMIT || 3);
    const windowSeconds = Number(process.env.OTP_ISSUE_WINDOW_SECONDS || 3600);

    const { allowed } = await this.redisService.checkRateLimit(rateLimitKey, maxAttempts, windowSeconds);
    if (!allowed) {
      throw new HttpException('Too many OTP requests. Please try again after 1 hour.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const isEmail = normalized.includes('@');
    const existing = await this.userModel.findOne(isEmail ? { email: normalized } : { phone: normalized });
    if (!existing && purpose !== 'register') {
      // No account: same answer as a sent code, so this endpoint cannot be used to
      // test which emails/phones are registered. Nothing is stored or sent.
      return { ok: true, channel: isEmail ? 'email' : 'sms' };
    }
    // F63 registration: a new identifier must be able to receive the code that
    // /auth/register requires (the code goes to the identifier itself).
    const u: any = existing || { id: null, email: isEmail ? normalized : undefined, phone: isEmail ? undefined : normalized };

    const code = require('crypto').randomInt(100000, 1000000).toString();
    // Store only a bcrypt hash. The plaintext code must never persist in Redis or logs.
    await this.redisService.setJson(
      this.otpKey(normalized),
      { code_hash: await bcrypt.hash(code, 12), user_id: u.id || null, attempts: 0 },
      this.OTP_TTL_SECONDS,
    );

    try {
      // F34 channel policy: SMS (phone identifiers, when enabled) → push →
      // email. Every channel is isolated; at least one must accept.
      const delivered = await this.deliverOtp(u, normalized, code, isEmail);
      if (
        process.env.NODE_ENV !== 'production' &&
        !process.env.SMTP_HOST &&
        !process.env.INFOBIP_API_KEY
      ) {
        console.warn('No OTP delivery channel configured; OTP was not logged.');
      }
      if (!delivered.length) {
        throw new ServiceUnavailableException({ message: 'otp_channel_unavailable', code: 'otp_channel_unavailable' });
      }
      return { ok: true, channel: delivered[0] };
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err;
      console.error('Failed to send verification code:', err);
      return { ok: false, error: err.message };
    }
  }

  async verifyOtp(identifier: string, code: string) {
    AuthService.assertString(identifier, 'identifier');
    AuthService.assertString(code, 'code');
    const normalized = this.normalizeOtpIdentifier(identifier);
    const verifyRate = await this.redisService.checkRateLimit(
      this.otpVerifyRateKey(normalized),
      Number(process.env.OTP_VERIFY_LIMIT || this.OTP_MAX_VERIFY_ATTEMPTS),
      Number(process.env.OTP_VERIFY_WINDOW_SECONDS || this.OTP_TTL_SECONDS),
    );
    if (!verifyRate.allowed) {
      throw new HttpException('Too many OTP verification attempts. Please request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const key = this.otpKey(normalized);
    const entry = await this.redisService.getJson<{ code_hash?: string; user_id?: string; attempts: number }>(key);
    if (!entry?.code_hash) {
      if (entry) await this.redisService.del(key);
      throw new BadRequestException('OTP expired or not requested');
    }

    if (entry.attempts >= this.OTP_MAX_VERIFY_ATTEMPTS) {
      await this.redisService.del(key);
      throw new HttpException('Too many invalid attempts. Please request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (!(await bcrypt.compare(code, entry.code_hash))) {
      // increment attempts (keep remaining TTL by re-setting with same expiry window)
      const ttl = await this.redisService.ttl(key);
      await this.redisService.setJson(key, { ...entry, attempts: entry.attempts + 1 }, ttl > 0 ? ttl : this.OTP_TTL_SECONDS);
      throw new BadRequestException('Invalid OTP code');
    }

    // valid — consume the code
    await this.redisService.del(key);
    await this.redisService.del(`ratelimit:${this.otpVerifyRateKey(normalized)}`);
    // F63: leave a short-lived verified marker so a subsequent registration
    // can prove identifier ownership without asking for the code twice.
    await this.redisService.setJson(this.otpVerifiedKey(normalized), { at: Date.now() }, 600).catch(() => {});
    const isEmail = identifier.includes('@');
    await this.userModel.findOneAndUpdate(
      isEmail ? { email: normalized } : { phone: normalized },
      { active: true }
    );
    return { ok: true };
  }

  /**
   * Password reset REQUIRES a verified OTP — previously this endpoint set any
   * account's password with no verification at all (critical ATO hole that
   * would bypass every login protection, including admin 2FA/Passkey).
   */
  async resetPassword(identifier: string, newPassword: string, code: string) {
    AuthService.assertString(identifier, 'identifier');
    AuthService.assertString(newPassword, 'password');
    AuthService.assertString(code, 'code');
    const isEmail = identifier.includes('@');
    const u = await this.userModel.findOne(isEmail ? { email: identifier } : { phone: identifier });
    if (!u) throw new UnauthorizedException('User not found');
    // Verify the OTP against the contact that actually received it.
    await this.verifyOtp(this.otpContact(u, identifier), code); // throws if invalid
    const hash = await bcrypt.hash(newPassword, 12);
    u.password_hash = hash;
    await u.save();
    // P3.0a: a reset must not leave stolen access/refresh tokens alive.
    await this.revokeAfterCredentialChange(u.id);
    return { ok: true };
  }

  /** The contact an OTP is keyed to — matches the channel the code was sent on. */
  private otpContact(u: any, identifier: string): string {
    if (identifier?.includes('@') && u?.email) return u.email;
    return u?.phone || u?.email || identifier;
  }

  async socialLogin(dto: { provider: 'google' | 'apple' | 'x' | 'snapchat'; token: string; email?: string; name?: string }) {
    // Q107: the email comes only from a provider token whose signature and
    // audience were verified, never from the body. X and Snapchat had no
    // verification at all (unsigned JWT decode, or a made-up address).
    let verified: { email: string; full_name: string } | null;
    if (dto.provider === 'google') verified = await this.verifyGoogleToken(dto.token);
    else if (dto.provider === 'apple') verified = await this.verifyAppleToken(dto.token);
    else throw new BadRequestException('social_provider_not_supported');
    if (!verified) throw new UnauthorizedException('invalid_social_token');
    const email = verified.email;
    const name = verified.full_name || dto.name || 'Social User';

    if (!email) {
      throw new BadRequestException('Email not provided by social provider');
    }

    let u = await this.userModel.findOne({ email });
    // Q107: social sign-in is a patient feature; staff and provider accounts
    // keep their password, 2FA and device checks.
    if (u && u.role !== UserRole.PATIENT) throw new ForbiddenException('password_login_required');
    if (!u) {
      u = await this.userModel.create({
        full_name: name,
        email: email,
        phone: '', 
        password_hash: '', 
        role: UserRole.PATIENT,
        active: true,
      });
      await this.patientModel.create({ user_id: u.id });
      this.events.emit(EVENTS.USER_REGISTERED, { user_id: u.id, role: u.role });
    }

    u.last_login_at = new Date();
    await u.save();
    this.events.emit(EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role });

    return { user: this.publicUser(u), token: this.signToken(u) };
  }

  /** Q107: allowed OAuth client ids for a provider; none configured means the provider is off. */
  private static clientIds(name: string): string[] {
    const ids = String(process.env[name] || '').split(',').map((v) => v.trim()).filter(Boolean);
    if (!ids.length) throw new ServiceUnavailableException('social_login_not_configured');
    return ids;
  }

  private static emailVerified(value: unknown): boolean {
    return value === true || value === 'true';
  }

  /** Google OAuth access token: tokeninfo must name one of our client ids and a verified email. */
  private async verifyGoogleToken(token: string): Promise<{ email: string; full_name: string } | null> {
    const allowed = AuthService.clientIds('GOOGLE_OAUTH_CLIENT_IDS');
    try {
      const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
      if (!info.ok) return null;
      const p: any = await info.json();
      if (!allowed.includes(String(p.aud || '')) && !allowed.includes(String(p.azp || ''))) return null;
      if (!AuthService.emailVerified(p.email_verified) || typeof p.email !== 'string' || !p.email) return null;
      if (p.expires_in !== undefined && !(Number(p.expires_in) > 0)) return null;
      let fullName = '';
      const profile = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (profile?.ok) {
        const u: any = await profile.json().catch(() => ({}));
        fullName = u.name || `${u.given_name || ''} ${u.family_name || ''}`.trim();
      }
      return { email: p.email.toLowerCase(), full_name: fullName };
    } catch {
      return null;
    }
  }

  private static appleKeys: { at: number; keys: Map<string, KeyObject> } | null = null;

  /** Apple's signing keys (JWKS), cached for an hour. */
  private static async appleKey(kid: string): Promise<KeyObject | null> {
    const fresh = AuthService.appleKeys && Date.now() - AuthService.appleKeys.at < 3600_000;
    if (!fresh || !AuthService.appleKeys!.keys.has(kid)) {
      const r = await fetch('https://appleid.apple.com/auth/keys');
      if (!r.ok) return null;
      const body: any = await r.json();
      const keys = new Map<string, KeyObject>();
      for (const jwk of Array.isArray(body?.keys) ? body.keys : []) {
        if (jwk?.kid && jwk.kty === 'RSA') keys.set(String(jwk.kid), createPublicKey({ key: jwk, format: 'jwk' }));
      }
      AuthService.appleKeys = { at: Date.now(), keys };
    }
    return AuthService.appleKeys!.keys.get(kid) || null;
  }

  /** Apple identity token: RS256 signature from Apple's keys, issuer, audience, expiry, verified email. */
  private async verifyAppleToken(token: string): Promise<{ email: string; full_name: string } | null> {
    const allowed = AuthService.clientIds('APPLE_SIGNIN_CLIENT_IDS');
    try {
      const verifier = new JwtService();
      const decoded: any = verifier.decode(token, { complete: true });
      const kid = decoded?.header?.kid;
      if (!kid || decoded?.header?.alg !== 'RS256') return null;
      const key = await AuthService.appleKey(String(kid));
      if (!key) return null;
      const p: any = verifier.verify(token, {
        publicKey: key.export({ type: 'spki', format: 'pem' }).toString(),
        algorithms: ['RS256'], issuer: 'https://appleid.apple.com', audience: allowed as [string, ...string[]],
      });
      if (!AuthService.emailVerified(p.email_verified) || typeof p.email !== 'string' || !p.email) return null;
      return { email: p.email.toLowerCase(), full_name: '' };
    } catch {
      return null;
    }
  }
}
