import { Injectable, BadRequestException, UnauthorizedException, ConflictException, GoneException, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
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
    @Optional() private push?: PushService,
    @Optional() private mail?: MailService,
    @Optional() private sms?: SmsService,
  ) {}

  signToken(user: any, deviceId?: string) {
    const accessToken = this.jwt.sign(
      { sub: user.id, id: user.id, role: user.role, phone: user.phone, is_guest: !!user.is_guest, ...(deviceId ? { dev: deviceId.slice(0, 32) } : {}) },
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
    const jtis = await client.smembers(`refresh_user:${userId}`);
    if (jtis?.length) await client.del(...jtis.map((j: string) => `refresh:${j}`));
    await client.del(`refresh_user:${userId}`);
    return { ok: true, revoked: jtis?.length || 0 };
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
      { _id: userId },
      { $push: { "legal_consents": { document_type: documentType, version, accepted_at: new Date() } } }
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
      channel: this.normalizeOtpIdentifier(identifier).includes('@') ? 'email' : 'sms',
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

    try {
      if (normalized.includes('@')) {
        await this.mail?.sendOtp(normalized, code);
      } else if (await this.sms?.isEnabled()) {
        await this.sms?.sendOtp(normalized, code);
      } else {
        await this.push?.sendToUser(user.id, 'رمز التحقق — نَبْض', `رمز التحقق الخاص بك: ${code}`, { kind: 'patient_web_otp' });
      }
    } catch {
      // Keep the response opaque and leave delivery observability to providers.
      // The raw OTP is never returned or logged by this path.
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
        await this.mail?.send(normalized, 'Password reset', `Your Nabdah Plus password-reset token is ${resetToken}. It expires in 60 seconds.`);
      } else if (await this.sms?.isEnabled()) {
        await this.sms?.sendOtp(normalized, resetToken);
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
    await this.revokeAllUserSessions(user.id);
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
      return { policy_id: consent.policy_id.trim(), version: consent.version.trim(), accepted_at: new Date() };
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
    if (!u || !u.password_hash) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
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
          return {
            user: this.publicUser(u),
            token: this.signToken(u),
            trusted_device: true,
            device_name: trusted.name,
          };
        }
      }
      // Passkey-enforced admin (ADMIN_PASSKEY_EMAIL, default Obaid08642@gmail.com):
      // password is already verified above — the ONLY next step is the WebAuthn
      // assertion. No session token, no OTP, and no challenge is ever issued
      // before this point (strict ordering, no password-only bypass).
      // Passkey 2FA is OPT-IN via ADMIN_PASSKEY_ENFORCED=true. It is currently
      // DISABLED: verification failed on every enrolled device (enroll succeeds,
      // login assertion is rejected), locking the owner out. While disabled the
      // designated admin signs in with email + OTP like everyone else.
      const passkeyEnforced = process.env.ADMIN_PASSKEY_ENFORCED === 'true';
      const designated = passkeyEnforced ? this.passkeys?.designatedEmail : undefined;
      if (designated && (u.email || '').trim().toLowerCase() === designated) {
        const keyCount = await this.passkeys!.countCredentials(u.id);
        if (keyCount > 0) {
          const options = await this.passkeys!.startLogin(u);
          return {
            requires_passkey: true,
            identifier: u.email,
            passkey_options: options,
            message: 'Passkey verification required.',
          };
        }
        // First-time bootstrap: no passkey enrolled yet → fall back to email OTP
        // so the owner can sign in and enroll a device from the security page.
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
    await this.verifyOtp(this.otpContact(u, identifier), code); // Will throw if invalid

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
  async completePasskeyLogin(identifier: string, response: any, ctx?: { ua?: string; ip?: string }) {
    AuthService.assertString(identifier, 'identifier');
    if (!this.passkeys) throw new UnauthorizedException('passkey_not_available');
    if ((identifier || '').trim().toLowerCase() !== this.passkeys.designatedEmail) {
      // Never reveal passkey state for other accounts
      throw new UnauthorizedException('Invalid credentials');
    }
    const u = await this.userModel.findOne({ email: identifier.trim().toLowerCase() });
    if (!u || (u.role !== UserRole.SUPER_ADMIN && u.role !== UserRole.ADMIN)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (u.active === false) throw new UnauthorizedException('Account disabled');
    const ownerId = await this.passkeys.finishLogin(response);
    if (ownerId !== u.id) throw new UnauthorizedException('Invalid credentials');
    u.last_login_at = new Date();
    await u.save();
    this.events.emit(EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role, method: 'passkey' });
    const result: any = { user: this.publicUser(u), token: this.signToken(u) };
    // A successful passkey assertion inherently proves device possession —
    // trust the device and alert about it being newly recognized.
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
            <li><b>الجهاز:</b> ${device?.name || 'غير معروف'}</li>
            <li><b>المتصفح/النظام:</b> ${device?.user_agent || '-'}</li>
            <li><b>عنوان IP:</b> ${ip || '-'}</li>
            <li><b>الوقت:</b> ${when}</li>
          </ul>
          <p>إذا لم يكن هذا أنت، ادخل فورًا إلى <b>الأمان ومفاتيح الدخول</b> واحذف الجهاز وغيّر كلمة المرور.</p>
        </div>`,
      );
    } catch (e) {
      // Alert failure must never block a successful, fully-verified login
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
        if (existing) {
          return { user: this.publicUser(existing), token: this.signToken(existing, deviceId) };
        }
      }
    }

    // 2) Create (or reuse by phone) the guest account
    const guestPhone = phone || `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let u = await this.userModel.findOne({ phone: guestPhone });
    if (!u) {
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

    let existingUser = guestUser;
    
    if (data.email) {
      const existsEmail = await this.userModel.findOne({ email: data.email });
      if (existsEmail) {
        if (existsEmail.id !== guestUserId) {
          // MERGE: move every piece of guest data to the existing account — zero loss
          await this.migrateGuestData(guestUserId, existsEmail.id);
          try {
            await this.patientModel.findOneAndUpdate(
              { user_id: existsEmail.id },
              { $set: { phone: data.phone, full_name: data.full_name } }
            );
          } catch (err) {
            // Ignore
          }

          this.events.emit(EVENTS.USER_GUEST_CONVERTED, { old_id: guestUserId, new_id: existsEmail.id });
          await this.userModel.deleteOne({ id: guestUserId });
          existingUser = existsEmail;
        }
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
    return {
      id: u.id,
      full_name: u.full_name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      avatar_url: u.avatar_url,
      is_guest: u.is_guest,
    };
  }

  async sendOtp(identifier: string) {
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
    const u = await this.userModel.findOne(isEmail ? { email: normalized } : { phone: normalized });
    if (!u) throw new UnauthorizedException('User not found');

    const code = require('crypto').randomInt(100000, 1000000).toString();
    // Store only a bcrypt hash. The plaintext code must never persist in Redis or logs.
    await this.redisService.setJson(
      this.otpKey(normalized),
      { code_hash: await bcrypt.hash(code, 12), user_id: u.id, attempts: 0 },
      this.OTP_TTL_SECONDS,
    );

    try {
      // CI-8: the OTP reaches the user on ALL channels together — email/SMS below
      // plus an in-app push notification, so app-only users still receive it.
      try {
        await this.push?.sendToUser(
          u.id,
          'رمز التحقق — نَبْض',
          `رمز التحقق الخاص بك: ${code} — صالح لمدة 10 دقائق. لا تشاركه مع أحد.`,
          { kind: 'otp' },
        );
      } catch { /* push must never break OTP delivery */ }
      if (isEmail) {
        // Unified mail pipeline: Resend primary → Amazon SES automatic fallback.
        await this.mail?.sendOtp(normalized, code);
      } else {
        // SMS is DISABLED by default (SMS_ENABLED=false / feature flag sms_enabled).
        // The OTP above already reached the user via push notification; when the
        // identifier is a phone we additionally check the flag before any SMS.
        const smsOn = await this.sms?.isEnabled();
        if (smsOn && process.env.INFOBIP_API_KEY) {
          await fetch(`https://${process.env.INFOBIP_BASE_URL}/sms/2/text/advanced`, {
            method: 'POST',
            headers: {
              'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{
                destinations: [{ to: normalized }],
                from: 'NabdahPlus',
                text: `Your Nabdah Plus OTP is ${code}. Expires in 10 mins.`,
              }]
            }),
          });
        }
      }
      if (
        process.env.NODE_ENV !== 'production' &&
        !process.env.SMTP_HOST &&
        !process.env.INFOBIP_API_KEY
      ) {
        console.warn('No OTP delivery channel configured; OTP was not logged.');
      }
      return { ok: true };
    } catch (err: any) {
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
    return { ok: true };
  }

  /** The contact an OTP is keyed to — matches the channel the code was sent on. */
  private otpContact(u: any, identifier: string): string {
    if (identifier?.includes('@') && u?.email) return u.email;
    return u?.phone || u?.email || identifier;
  }

  async socialLogin(dto: { provider: 'google' | 'apple' | 'x' | 'snapchat'; token: string; email?: string; name?: string }) {
    let email = dto.email;
    let name = dto.name || 'Social User';

    if (dto.provider === 'google') {
      const googleInfo = await this.verifyGoogleToken(dto.token);
      if (!googleInfo) throw new UnauthorizedException('Invalid Google token');
      email = googleInfo.email;
      name = googleInfo.full_name || name;
    } else if (dto.provider === 'apple') {
      const appleInfo = await this.verifyAppleToken(dto.token);
      if (!appleInfo) throw new UnauthorizedException('Invalid Apple token');
      email = appleInfo.email;
      name = appleInfo.full_name || name;
    } else if (dto.provider === 'x') {
      const xInfo = await this.verifyXToken(dto.token);
      if (!xInfo) throw new UnauthorizedException('Invalid X token');
      email = xInfo.email;
      name = xInfo.full_name || name;
    } else if (dto.provider === 'snapchat') {
      const snapchatInfo = await this.verifySnapchatToken(dto.token);
      if (!snapchatInfo) throw new UnauthorizedException('Invalid Snapchat token');
      email = snapchatInfo.email;
      name = snapchatInfo.full_name || name;
    }

    if (!email) {
      throw new BadRequestException('Email not provided by social provider');
    }

    let u = await this.userModel.findOne({ email });
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

  private async verifyGoogleToken(token: string): Promise<any> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const payload: any = await response.json();
        return {
          email: payload.email,
          full_name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  private async verifyAppleToken(token: string): Promise<any> {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return {
          email: payload.email,
          full_name: payload.name ? `${payload.name.firstName || ''} ${payload.name.lastName || ''}`.trim() : 'Apple User',
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  private async verifyXToken(token: string): Promise<any> {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return {
          email: payload.email || `${payload.username || 'x_user'}@twitter.com`,
          full_name: payload.name || 'X User',
        };
      }
      return { email: `x_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'X User' };
    } catch (e) {
      return { email: `x_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'X User' };
    }
  }

  private async verifySnapchatToken(token: string): Promise<any> {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return {
          email: payload.email || `${payload.username || 'snap_user'}@snapchat.com`,
          full_name: payload.name || 'Snapchat User',
        };
      }
      return { email: `snapchat_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'Snapchat User' };
    } catch (e) {
      return { email: `snapchat_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'Snapchat User' };
    }
  }
}
