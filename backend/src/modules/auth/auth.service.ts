import { NotFoundException, Injectable, BadRequestException, UnauthorizedException, ConflictException, GoneException, ForbiddenException, Inject, HttpException, HttpStatus, ServiceUnavailableException, GatewayTimeoutException } from '@nestjs/common';
import { currentRequestMeta, describeClient, maskIp } from '../../common/request-meta';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, createHmac, createPublicKey, KeyObject, randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { Optional } from '@nestjs/common';
import { KillSwitchesService } from '../kill-switches/kill-switches.service';
import { PushService } from '../push/push.module';
import { escapeHtml, MailService } from '../mail/mail.module';
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
import { normalizeDigits } from './checkout-contact.service';
import { AdminSessionService } from './admin-session.service';
import { revokeAllCredentialSessions, revokeRedisRefreshSessions, RevocationResult } from '../../common/credential-revocation';
import { Logger } from '@nestjs/common';
import { timedFetch } from '../../common/external-call';

/** Google / Apple lookups: 5 s per attempt, a read, so up to 2 repeats; a timeout is a 504 `social_login_timeout`. */
const SOCIAL_FETCH = { timeoutMs: 5000, retries: 2, label: 'social-login', timeoutCode: 'social_login_timeout' } as const;
import { randomUUID } from 'crypto';
import { GuestService } from './guest.service';
import { AccountLinkingService } from './account-linking.service';
import { PasswordSecurityService, dummyPasswordHash } from '../../common/password-security.service';
import { LoginLockService } from '../../common/login-lock.service';
import { OtpAbuseGuard } from '../../common/otp-abuse.service';
import { I18nService, resolveLang } from '../i18n/i18n.service';
import { logEvent } from '../../common/structured-logger';

/** A device id is an opaque token of 8-128 plain characters; anything else is not a device. */
export function normaliseGuestDeviceId(raw: unknown): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === 'string' && /^[A-Za-z0-9._:-]{8,128}$/.test(v) ? v : null;
}

/** The stored form of a device id: a keyed hash, so the database never holds the id a device presents. */
export function guestDeviceHash(deviceId: string): string {
  return createHmac('sha256', process.env.JWT_SECRET || 'guest-device').update(`guest-device:${deviceId}`).digest('hex').slice(0, 48);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // M0-01: hardcoded admin seeding removed from boot — use scripts/seed-admin.ts instead.
  // M0-03: OTPs are now stored in Redis (TTL-based) instead of an in-memory Map,
  // so they survive restarts and work across multiple instances.

  private readonly OTP_TTL_SECONDS = 5 * 60; // 5 minutes
  private readonly OTP_MAX_VERIFY_ATTEMPTS = 5;
  private readonly PATIENT_OTP_TTL_SECONDS = 5 * 60;
  private readonly PATIENT_EXCHANGE_TTL_SECONDS = 60;
  /** A password-reset link is opened from a mailbox or a phone, often minutes later: 30 minutes, single use. */
  private readonly PASSWORD_RESET_TTL_SECONDS = 30 * 60;
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
    @Optional() private guests?: GuestService,
    @Optional() private linking?: AccountLinkingService,
    // 16.2: length + breached-password policy, applied before anything is stored.
    @Optional() private passwordSecurity?: PasswordSecurityService,
    // 16.3: SMS pumping — per-IP fan-out, country allow-list, daily budget.
    @Optional() private otpAbuse?: OtpAbuseGuard,
    // Issue 955: the admin "new registrations" kill switch.
    @Optional() private killSwitches?: KillSwitchesService,
    // 16.2: progressive lockout of password sign-in.
    @Optional() private loginLock?: LoginLockService,
  ) {}

  /**
   * 21.6 — when socialLogin has just verified a Google/Apple token, that token
   * is the proof for any link this account asked for with the same provider.
   * Nothing from the request body takes part in this.
   */
  private async recordProviderLinkProofs(accountId: string, method: 'google' | 'apple', email: string): Promise<void> {
    if (!this.linking) return;
    try {
      for (const linkId of await this.linking.pendingForProvider(accountId, method)) {
        await this.linking.recordProviderProof(linkId, `${method}:${email.toLowerCase()}`, method);
      }
    } catch (e: any) {
      this.logger.warn(`provider link proof failed: ${e?.message}`);
    }
  }

  signToken(user: any, deviceIdIn?: string, session?: { sid?: string; created?: number }) {
    // 21.7: a sign-in path that was not handed a device id (password login, register, social) uses the one on the request
    const deviceId = deviceIdIn ?? currentRequestMeta().deviceId;
    // The access token carries its own id: the guest merge burns that jti so a
    // captured guest token cannot be replayed (21.2). Without it, single-use
    // could not be enforced.
    const accessJti = randomUUID();
    // 21.7: `sid` names the sign-in (one per device); it survives every refresh, so the session list, "sign out other
    // devices" and the push token of this device can all point at it.
    const sid = session?.sid || randomUUID();
    const accessToken = this.jwt.sign(
      { sub: user.id, id: user.id, role: user.role, phone: user.phone, is_guest: !!user.is_guest, tv: Number(user.token_version ?? 0), jti: accessJti, sid, ...(deviceId ? { dev: deviceId.slice(0, 32) } : {}) },
      { expiresIn: '1h' } // Short-lived access token
    );
    // Refresh token carries a unique session id (jti) — tracked in Redis so
    // rotation can revoke the previous token and detect replay attacks.
    const jti = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: user.id, type: 'refresh', jti, sid },
      { expiresIn: '14d' }
    );
    this.storeRefreshSession(user.id, jti, deviceId, { sid, created: session?.created }).catch(() => {});
    return { accessToken, refreshToken };
  }

  /** Persist the refresh session (14d TTL matches token life), device-bound. */
  private async storeRefreshSession(userId: string, jti: string, deviceId?: string, session?: { sid?: string; created?: number }) {
    try {
      const client = (this.redisService as any).getClient?.();
      if (!client) return;
      const meta = currentRequestMeta();
      const now = Date.now();
      // s: the sign-in id, c: when this sign-in started, l: last use, ua/ip: the client of the latest use
      const record = { u: userId, d: deviceId || null, s: session?.sid || jti, c: session?.created ?? now, l: now, ua: meta.userAgent ?? null, ip: meta.ip ?? null };
      await client.set(`refresh:${jti}`, JSON.stringify(record), 'EX', 14 * 24 * 3600);
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
    let sessionMeta: { sid?: string; created?: number } = { sid: payload.sid };
    if (client && payload.jti) {
      const raw = await client.get(`refresh:${payload.jti}`);
      if (!raw) {
        // Two requests of one client can present the same token a moment apart (two tabs, a retry): within seconds of
        // the rotation that is a lost race, not theft, so only this call fails.
        if (await client.get(`refresh_rotated:${payload.jti}`).catch(() => null)) throw new UnauthorizedException('refresh_token_rotated');
        // A sign-in the person ended on purpose ("sign out other devices", sign-out): its token is dead, but presenting it
        // again is not theft, and must not end the sign-ins they kept.
        if (await client.get(`refresh_revoked:${payload.jti}`).catch(() => null)) throw new UnauthorizedException('refresh_token_revoked');
        // Reuse of a rotated/unknown token — possible theft: kill the whole family
        if (payload.sub) await this.endAllSessions(payload.sub);
        throw new UnauthorizedException('refresh_token_reused_or_revoked');
      }
      try {
        const stored = JSON.parse(raw);
        boundDevice = stored.d || null;
        sessionMeta = { sid: payload.sid || stored.s || payload.jti, created: stored.c };
      } catch { boundDevice = null; }
      // Device binding: a token minted for device A must not refresh on device B
      if (boundDevice && deviceId && boundDevice !== deviceId) {
        if (payload.sub) await this.endAllSessions(payload.sub);
        throw new UnauthorizedException('refresh_token_device_mismatch');
      }
      // Rotate: revoke the presented token immediately
      await client.del(`refresh:${payload.jti}`);
      await client.set(`refresh_rotated:${payload.jti}`, '1', 'EX', 10).catch(() => undefined);
      if (payload.sub) await client.srem(`refresh_user:${payload.sub}`, payload.jti);
    }

    const u = await this.userModel.findOne({ id: payload.sub });
    if (!u || u.active === false) throw new UnauthorizedException('User not found or disabled');
    // 21.8: a guest who keeps using the app is not inactive; written at most once a day
    if (u.is_guest === true) await this.touchGuestActivity(u);
    return this.signToken(u, boundDevice || deviceId, sessionMeta);
  }

  /** Theft response: every sign-in of the account ends now, access tokens included. */
  private async endAllSessions(userId: string): Promise<void> {
    await this.endSessions(userId, () => true).catch(() => undefined);
    await this.revokeAllUserSessions(userId).catch(() => undefined);
  }

  /** 21.8: the guest was active now (at most one write a day). Failure never blocks the refresh. */
  private async touchGuestActivity(u: any): Promise<void> {
    const last = u.last_active_at ? new Date(u.last_active_at).getTime() : 0;
    if (Date.now() - last < 24 * 3600 * 1000) return;
    try { await this.userModel.updateOne({ id: u.id }, { $set: { last_active_at: new Date() } }); } catch { /* best effort */ }
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
      const decoded = this.jwt.decode(refreshToken) as any;
      if (decoded?.jti) await this.storeRefreshSession(userId, decoded.jti, deviceId, { sid: decoded.sid });
    } catch { /* same contract as signToken: store failure never breaks the response */ }
  }

  /**
   * Issue 440 / 21.7: sign out with the refresh token of the session. The session ends, its access tokens stop working
   * at once and the push tokens of this device are removed. A token that does not verify revokes nothing.
   */
  async revokeRefreshSession(refreshToken: string): Promise<boolean> {
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken);
    } catch {
      return false;
    }
    if (payload?.type !== 'refresh' || !payload.jti || !payload.sub) return false;
    const ended = await this.endSessions(payload.sub, (m) => m.jti === payload.jti);
    if (ended.revoked > 0) this.events.emit('auth.session_ended', { user_id: payload.sub, scope: 'this_device', sessions: ended.revoked });
    return ended.revoked > 0;
  }

  async logoutAllDevices(userId: string) {
    // Real revocation: every sign-in ends, its access tokens stop at once and its push tokens go
    await this.endAllSessions(userId);
    this.events.emit('USER_LOGGED_OUT_ALL', { user_id: userId });
    this.events.emit('auth.session_ended', { user_id: userId, scope: 'all_devices' });
    return { ok: true, message: 'Logged out from all devices' };
  }

  /**
   * The one place sessions end. Every refresh session of `userId` that `match` accepts is deleted, its sign-in id is
   * marked revoked (the guard refuses its access tokens until they would have expired anyway) and the push tokens of
   * that sign-in (or, for tokens registered before sessions were tracked, of its device) are removed.
   */
  private async endSessions(
    userId: string,
    match: (m: { jti: string; sid: string; device: string | null }) => boolean,
  ): Promise<{ revoked: number; sids: string[]; push_removed: number }> {
    const client = (this.redisService as any).getClient?.();
    if (!client) return { revoked: 0, sids: [], push_removed: 0 };
    const jtis: string[] = await client.smembers(`refresh_user:${userId}`).catch(() => [] as string[]);
    const sids = new Set<string>();
    const devices = new Set<string>();
    let revoked = 0;
    for (const jti of jtis) {
      const raw = await client.get(`refresh:${jti}`).catch(() => null);
      if (!raw) { await client.srem(`refresh_user:${userId}`, jti).catch(() => 0); continue; }
      let rec: any = {};
      try { rec = JSON.parse(raw); } catch { rec = {}; }
      const entry = { jti, sid: String(rec.s || jti), device: (rec.d as string | null) ?? null };
      if (!match(entry)) continue;
      await client.del(`refresh:${jti}`);
      await client.set(`refresh_revoked:${jti}`, '1', 'EX', 14 * 24 * 3600).catch(() => undefined);
      await client.srem(`refresh_user:${userId}`, jti);
      revoked += 1;
      sids.add(entry.sid);
      if (entry.device) devices.add(entry.device);
    }
    if (!sids.size) return { revoked, sids: [], push_removed: 0 };
    const db = (this.userModel as any).model?.db ?? (this.userModel as any).db;
    if (db) {
      const col = db.collection('revoked_sessions');
      // the marks only matter while an access token of the session could still be alive (1 h) — keep them 2 h
      await col.createIndex({ at: 1 }, { expireAfterSeconds: 2 * 3600 }).catch(() => undefined);
      const at = new Date();
      await Promise.all([...sids].map((sid) => col.updateOne({ sid }, { $set: { sid, user_id: userId, at } }, { upsert: true }).catch(() => undefined)));
    }
    const push_removed = (await this.push?.removeForSessions?.(userId, [...sids], [...devices]).catch(() => 0)) ?? 0;
    this.events.emit('USER_SESSIONS_ENDED', { user_id: userId, session_ids: [...sids] });
    return { revoked, sids: [...sids], push_removed };
  }

  /**
   * 21.7 — sign out of this device. The sign-in of the caller (its `sid`, or for older tokens its device id) ends; the
   * other devices stay signed in. Nothing matches without one of the two, so an anonymous call never signs everyone out.
   */
  async logoutDevice(userId: string, current: { sid?: string; deviceId?: string }) {
    if (!current.sid && !current.deviceId) throw new BadRequestException('current_session_unknown');
    const r = await this.endSessions(userId, (m) => (current.sid ? m.sid === current.sid : m.device === current.deviceId));
    this.events.emit('USER_LOGGED_OUT', { user_id: userId, device_id: current.deviceId ?? null });
    this.events.emit('auth.session_ended', { user_id: userId, scope: 'this_device', sessions: r.revoked });
    return { ok: true, sessions_revoked: r.revoked, push_tokens_removed: r.push_removed };
  }

  /** 21.7 — "sign out other devices": every sign-in except the caller's. */
  async revokeOtherSessions(userId: string, current: { sid?: string; deviceId?: string }) {
    if (!current.sid && !current.deviceId) throw new BadRequestException('current_session_unknown');
    const r = await this.endSessions(userId, (m) => (current.sid ? m.sid !== current.sid : m.device !== current.deviceId));
    if (r.revoked > 0) this.events.emit('auth.session_ended', { user_id: userId, scope: 'other_devices', sessions: r.revoked });
    return { ok: true, sessions_revoked: r.revoked, push_tokens_removed: r.push_removed };
  }

  /**
   * 21.7 — sign out the sign-in that holds this refresh session id (what `GET /users/me/sessions` lists and the apps send to
   * `DELETE /users/me/sessions/:jti`). Same effect as ending it by its sign-in id: the access token stops at once and its
   * push tokens go.
   */
  async revokeSessionByJti(userId: string, jti: string) {
    const r = await this.endSessions(userId, (m) => m.jti === jti);
    if (!r.revoked) throw new NotFoundException('session_not_found');
    return { ok: true, sessions_revoked: r.revoked, push_tokens_removed: r.push_removed };
  }

  /** 21.7 — sign out one listed device by its session id. Only the account's own sessions are ever in the set. */
  async revokeSession(userId: string, sessionId: string) {
    const r = await this.endSessions(userId, (m) => m.sid === sessionId);
    if (!r.revoked) throw new NotFoundException('session_not_found');
    return { ok: true, sessions_revoked: r.revoked, push_tokens_removed: r.push_removed };
  }

  /** 21.7 — the signed-in devices of an account, newest use first; the caller's own is marked `current`. */
  async listSessions(userId: string, current: { sid?: string; deviceId?: string } = {}) {
    const client = (this.redisService as any).getClient?.();
    if (!client) return [];
    const jtis: string[] = await client.smembers(`refresh_user:${userId}`).catch(() => [] as string[]);
    const out: Array<{
      session_id: string; device_id: string | null; platform: string; label: string;
      created_at: string | null; last_seen_at: string | null; ip: string | null; current: boolean;
    }> = [];
    for (const jti of jtis) {
      const raw = await client.get(`refresh:${jti}`).catch(() => null);
      if (!raw) continue;
      let rec: any = {};
      try { rec = JSON.parse(raw); } catch { rec = {}; }
      const sid = String(rec.s || jti);
      const who = describeClient(rec.ua);
      out.push({
        session_id: sid,
        device_id: rec.d ?? null,
        platform: who.platform,
        label: who.label,
        created_at: rec.c ? new Date(rec.c).toISOString() : null,
        last_seen_at: rec.l ? new Date(rec.l).toISOString() : null,
        ip: maskIp(rec.ip),
        current: current.sid ? sid === current.sid : !!current.deviceId && rec.d === current.deviceId,
      });
    }
    return out.sort((a, b) => String(b.last_seen_at).localeCompare(String(a.last_seen_at)));
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
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) return trimmed.toLowerCase();
    return AuthService.normalizePhone(trimmed);
  }

  /**
   * 431: one canonical form for phone identifiers so `05…`, `+9665…`,
   * `009665…` and `9665…` all match the same account. Non-SA numbers and
   * anything unparsable are returned trimmed and unchanged.
   *
   * Phase 17.9: the login OTP and the password-reset token are typed on a phone
   * keypad, and an Arabic-locale keyboard produces Arabic-Indic (٠-٩) or Eastern
   * Arabic-Indic (۰-۹) digits. Those are converted to Latin *before* the shape
   * checks, because otherwise no pattern matches and the raw string is returned,
   * so the OTP key is built from a different string than the stored number and the
   * lookup silently misses the account. Reuses the one helper the checkout path
   * already uses rather than adding a second digit table.
   */
  static normalizePhone(raw: string): string {
    const digits = normalizeDigits(raw).replace(/[\s\-().]/g, '');
    if (/^\+\d{7,15}$/.test(digits)) return digits;
    const bare = digits.replace(/^\+/, '');
    if (/^00\d{7,14}$/.test(bare)) return `+${bare.slice(2)}`;
    if (/^0\d{9}$/.test(bare)) return `+966${bare.slice(1)}`;
    if (/^966\d{9}$/.test(bare)) return `+${bare}`;
    if (/^5\d{8}$/.test(bare)) return `+966${bare}`;
    return raw.trim();
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
        if (await this.sms?.sendOtp(user.phone, code)) {
          delivered.push('sms');
          // 16.3: the daily budget is spent only now, when a message really
          // left. check() only reads it, so a refused or undelivered OTP costs
          // nothing. If the budget is already gone, stop before sending.
          const spent = await this.otpAbuse?.recordSmsSent();
          if (spent === false) {
            this.logger.warn('otp not sent: the daily SMS budget is spent');
            return delivered;
          }
        }
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
  async requestPatientOtp(identifier: string, ip?: string) {
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

    // 16.3: SMS pumping — served countries only, bounded fan-out per IP, and
    // a daily budget that stops sends instead of failing at the provider.
    const abuse = await this.otpAbuse?.check(normalized, ip);
    if (abuse && !abuse.allowed) {
      throw new HttpException(
        { message: abuse.code, code: abuse.code, statusCode: HttpStatus.TOO_MANY_REQUESTS },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.userModel.findOne(normalized.includes('@') ? { email: normalized } : { phone: normalized });
    if (!user || user.active === false) return this.opaqueOtpResponse(normalized);

    this.events.emit('auth.otp_requested', { user_id: user.id, purpose: 'login', channel: normalized.includes('@') ? 'email' : 'phone' });
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
  async exchangePatientSession(exchangeToken: string, guestToken?: string) {
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
    // 21.2: signing in with an email code merges the guest data too.
    await this.mergeGuestFromRequest(guestToken, user.id);
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
    await this.redisService.setJson(this.passwordResetKey(resetToken), { user_id: user.id }, this.PASSWORD_RESET_TTL_SECONDS);
    await this.deliverPasswordReset(user, normalized.includes('@') ? normalized : user.email, resetToken);
    return { requested: true };
  }

  /**
   * 435: the reset reaches the person as a link to the website's reset page (the page reads the token from the link), valid
   * for 30 minutes, in their language. Email when there is one; a phone-only account gets it by SMS (when SMS is on) and on
   * its signed-in devices by push. Every channel is best effort and the answer stays the same opaque `requested`.
   */
  private async deliverPasswordReset(user: any, email: string | undefined, resetToken: string) {
    const webLocales = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];
    const pref = String(user?.preferred_lang || '').toLowerCase().replace(/^tl$/, 'fil');
    const locale = webLocales.includes(pref) ? pref : 'ar';
    const site = (process.env.PUBLIC_SITE_ORIGIN || 'https://nabd.plus').replace(/\/$/, '');
    const link = `${site}/${locale}/password-reset?token=${encodeURIComponent(resetToken)}`;
    const minutes = Math.round(this.PASSWORD_RESET_TTL_SECONDS / 60);
    const i18n = new I18nService();
    const lang = resolveLang(pref);
    const body = i18n.t('auth.passwordReset.body', lang, { minutes });
    if (email) {
      try {
        await this.mail?.sendPasswordReset(email, i18n.t('auth.passwordReset.subject', lang), body, i18n.t('auth.passwordReset.action', lang), link, lang === 'en' ? 'ltr' : 'rtl');
      } catch { /* do not disclose account state */ }
      return;
    }
    if (user?.phone) {
      try { await this.sms?.sendText(user.phone, `${body} ${link}`); } catch { /* best effort */ }
    }
    if (user?.id) {
      try { await this.push?.sendTemplated(user.id, 'auth.passwordReset.subject', 'auth.passwordReset.body', { kind: 'password_reset', url: link }, { minutes }); } catch { /* best effort */ }
    }
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
    // 16.2: the new password must pass the same policy as a registration.
    const resetPolicy = await this.passwordSecurity?.check(newPassword);
    if (resetPolicy && !resetPolicy.ok) {
      throw new BadRequestException({ message: resetPolicy.code, code: resetPolicy.code, statusCode: HttpStatus.BAD_REQUEST });
    }
    user.password_hash = await bcrypt.hash(newPassword, 12);
    await user.save();
    // P3.0a: reset ends every session (access + refresh, patient + provider).
    await this.revokeAfterCredentialChange(user.id);
    this.events.emit('auth.password_changed', { user_id: user.id, role: user.role, how: 'reset_link' });
    return { reset: true };
  }

  /**
   * Contract V1 patient registration. This deliberately does not issue a
   * session token: the new account must complete the opaque OTP bridge first.
   */

  /** Raw legal collections when the service is wired to a real connection (skipped in unit doubles). */
  private get legalDb(): any | null {
    try {
      return (this.userModel as any)?.model?.db ?? null;
    } catch {
      return null;
    }
  }

  /**
   * D-38: sign-up needs the current patient texts. When the deployment configures
   * legal_policies, patient_terms and privacy_policy must each be consented at their
   * current version, and no consent may name an unknown policy. Otherwise 400 — and
   * the caller creates no account. Deployments without configured policies keep the
   * legacy behaviour.
   */
  private async enforceSignupConsents(consents: Array<{ policy_id: string; version: string }>): Promise<void> {
    const db = this.legalDb;
    if (!db) return;
    const col = db.collection('legal_policies');
    if (!col) return;
    const required: any[] = await col.find({ key: { $in: ['patient_terms', 'privacy_policy'] } }).toArray();
    const configured = required.filter((p: any) => p && p.requires_acceptance !== false);
    const all: any[] = await col.find({}).toArray();
    if (!configured.length && !all.length) return;
    const byKey = new Map(configured.map((p: any) => [p.key, p]));
    for (const key of ['patient_terms', 'privacy_policy']) {
      const policy = byKey.get(key);
      if (!policy) continue;
      const given = consents.find((c) => c.policy_id === key);
      if (!given || given.version !== policy.version) {
        throw new BadRequestException({ message: 'consent_invalid', code: 'consent_invalid', statusCode: HttpStatus.BAD_REQUEST });
      }
    }
    if (all.length) {
      const known = new Set(all.map((p: any) => p.key));
      for (const c of consents) {
        if (!known.has(c.policy_id)) {
          throw new BadRequestException({ message: 'consent_invalid', code: 'consent_invalid', statusCode: HttpStatus.BAD_REQUEST });
        }
      }
    }
  }

  /** D-38: record the signup consents in legal_acceptances with version and time. */
  private async recordSignupAcceptances(userId: string, consents: Array<{ policy_id: string; version: string }>): Promise<void> {
    const db = this.legalDb;
    if (!db) return;
    const col = db.collection('legal_acceptances');
    if (!col) return;
    const now = new Date();
    for (const c of consents) {
      await col.insertOne({ user_id: userId, policy_key: c.policy_id, version: c.version, timestamp: now });
      this.events.emit('legal.accepted', { user_id: userId, role: 'patient', policy_key: c.policy_id, version: c.version });
    }
  }

  async registerPatientContract(data: {
    name: string;
    identifier: string;
    password: string;
    locale: string;
    consents: Array<{ policy_id: string; version: string }>;
  }) {
    await this.killSwitches?.assertOn('new_registrations');
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

    // D-38: sign-up records acceptance of the current patient texts. Refused before any
    // account is created when a required text is missing, stale, or unknown.
    await this.enforceSignupConsents(consents);

    // 16.2: length and breach-list policy, before anything is stored.
    const contractPolicy = await this.passwordSecurity?.check(data.password);
    if (contractPolicy && !contractPolicy.ok) {
      throw new BadRequestException({ message: contractPolicy.code, code: contractPolicy.code, statusCode: HttpStatus.BAD_REQUEST });
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
    // D-38: the signup acceptances land in legal_acceptances with version and time.
    await this.recordSignupAcceptances(user.id, consents);
    this.events.emit(EVENTS.USER_REGISTERED, { user_id: user.id, role: user.role });

    // The response remains minimal; requestPatientOtp emits the opaque delivery DTO. The account exists now: a code
    // that could not be sent (provider down, rate limit) is reported as such, never as a failed registration (issue 434).
    try {
      await this.requestPatientOtp(identifier);
    } catch {
      return { registered: true, otp_sent: false };
    }
    return { registered: true };
  }

  async register(data: { full_name: string; phone?: string; password: string; email?: string; role?: UserRole }, guestToken?: string) {
    // Refused before the verified OTP is consumed, so the same code works once registrations are back on.
    await this.killSwitches?.assertOn('new_registrations');
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
    // 16.2: length and breach-list policy, before anything is stored.
    const policy = await this.passwordSecurity?.check(data.password);
    if (policy && !policy.ok) {
      throw new BadRequestException({ message: policy.code, code: policy.code, statusCode: HttpStatus.BAD_REQUEST });
    }
    const hash = await bcrypt.hash(data.password, 12);
    // S6 privilege-escalation fix: public registration may ONLY create patient or
    // independently-onboarding provider accounts (which stay unverified until admin
    // approval). Staff/privileged roles (admin, finance, support, reception…) are
    // created exclusively by admins through the staff endpoints — never self-assigned.
    const SELF_REGISTERABLE: string[] = [
      UserRole.PATIENT, UserRole.DOCTOR, UserRole.PHARMACY, UserRole.HOSPITAL,
      UserRole.LAB, UserRole.RADIOLOGY, UserRole.HOME_CARE, UserRole.NURSING,
      UserRole.NURSE, UserRole.PHYSIOTHERAPIST,
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
    // 21.2: registering from a guest device keeps the cart and the orders.
    await this.mergeGuestFromRequest(guestToken, u.id);
    return { user: this.publicUser(u), token: this.signToken(u) };
  }

  /** 23.2: a failed sign-in is an audit event (the identifier is only ever stored hashed, by the audit handler). */
  private auditLoginFailed(identifier: string, userId: string | undefined, reason: string, ctx?: { ua?: string; ip?: string }) {
    this.events.emit('auth.login_failed', { phone: identifier, user_id: userId, reason, ip: ctx?.ip, user_agent: ctx?.ua });
  }

  async login(identifier: string, password: string, ctx?: { deviceToken?: string; ua?: string; ip?: string }, guestToken?: string) {
    AuthService.assertString(identifier, 'identifier');
    AuthService.assertString(password, 'password');
    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier.trim().toLowerCase() } : { phone: identifier };
    // 16.2: a locked identifier is refused before anything about the account is looked at.
    await this.loginLock?.assertNotLocked(identifier, ctx?.ip);
    const u = await this.userModel.findOne(query);
    if (!u || !u.password_hash) {
      // The same bcrypt work as a real check, so the answer does not come back faster for an unknown account.
      await bcrypt.compare(password, await dummyPasswordHash());
      if (u) await this.adminLoginAlert(u, false, ctx); // C5: known account, bad secret
      this.auditLoginFailed(identifier, u?.id, u ? 'no_password' : 'unknown_account', ctx);
      await this.loginLock?.recordFailure(identifier, ctx?.ip);
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) {
      await this.adminLoginAlert(u, false, ctx); // C5: failed admin login attempt
      this.auditLoginFailed(identifier, u.id, 'wrong_password', ctx);
      await this.loginLock?.recordFailure(identifier, ctx?.ip);
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.loginLock?.recordSuccess(identifier, ctx?.ip);
    if (u.active === false) {
      this.auditLoginFailed(identifier, u.id, 'account_disabled', ctx);
      throw new UnauthorizedException('Account disabled');
    }

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
    // 21.2: password sign-in merges the guest data too.
    await this.mergeGuestFromRequest(guestToken, u.id);
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
      // D-35 reviewer (device-bound keys): a passkey login auto-enrols the
      // presenting device ONLY when the verified credential is known to live
      // on a single device. A synced credential (same Apple ID on a third
      // device) still signs the admin in, but its device must come through
      // the approval + e-mailed-code flow like any other new device.
      let bound = false;
      try {
        bound = await this.passkeys?.isSingleDeviceCredential?.(response?.id);
      } catch {
        bound = false;
      }
      if (bound) {
        await this.adminDevices.autoEnroll(u.id, ctx.deviceId, ctx.ua, ctx.deviceName, response?.id);
      }
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
    const revoked = await this.deviceTrust.revoke(userId, deviceId);
    this.events.emit('auth.device_changed', { user_id: userId, change: 'revoked' });
    return revoked;
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
  /**
   * 21.1 - the device-bound guest account.
   *
   * A guest is a real server-side row (UUID, `is_guest`), found by DEVICE ID only. The binding lives in MongoDB
   * (`guest_devices`, a keyed hash of the id, unique), so a Redis restart or eviction cannot turn a reopen into a new
   * guest; reinstalling the app makes a new device id and so a new guest. The IP address is never part of the identity.
   *
   * A client-supplied phone is NOT identity either (it is unverified): it used to create a guest row carrying someone
   * else's number (blocking that person's own sign-up) and to hand the session of the guest who typed it to anyone who
   * knew it. The phone is asked for at checkout (21.5), where it is a contact, not a key. The `phone` argument is kept
   * only so older callers still compile; it is ignored.
   */
  private guestDeviceIndexReady: Promise<unknown> | null = null;
  private ensureGuestDeviceIndex(bindings: { createIndex: (...a: any[]) => Promise<unknown> }) {
    // unique: one guest per device, even for two requests at once; created once per process
    return (this.guestDeviceIndexReady ??= bindings.createIndex({ device_hash: 1 }, { unique: true, name: 'device_hash_unique' }).catch((e: unknown) => {
      this.guestDeviceIndexReady = null;
      throw e;
    }));
  }

  async guest(_ignoredPhone?: string, deviceId?: string) {
    const device = normaliseGuestDeviceId(deviceId);
    if (!device) throw new BadRequestException('device_id_required');
    const deviceHash = guestDeviceHash(device);
    const bindings = this.userModel.db.collection('guest_devices');
    await this.ensureGuestDeviceIndex(bindings);

    // 1) a guest already bound to this device: re-issue its session (only while it is still a guest)
    const bound: any = await bindings.findOne({ device_hash: deviceHash });
    if (bound?.guest_id) {
      const existing = await this.userModel.findOne({ id: bound.guest_id });
      if (existing && existing.is_guest === true) {
        await bindings.updateOne({ device_hash: deviceHash }, { $set: { last_seen_at: new Date() } });
        return { user: this.publicUser(existing), token: this.signToken(existing, device) };
      }
    }

    // 2) create the guest and CLAIM the binding. The claim is one atomic operation, so of several first requests of one device
    //    exactly one binding is stored; the others delete the guest they made and use the winner's.
    const guestPhone = `guest-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const u = await this.userModel.create({ full_name: 'Guest', phone: guestPhone, is_guest: true, role: UserRole.PATIENT });
    await this.patientModel.create({ user_id: u.id });
    const now = new Date();
    let winnerId: string | undefined;
    if (bound?.guest_id) {
      // a stale binding (the guest was converted or deleted): replace it, but only if nobody else did first
      const r: any = await bindings.updateOne({ device_hash: deviceHash, guest_id: bound.guest_id }, { $set: { guest_id: u.id, last_seen_at: now } });
      winnerId = r?.matchedCount ? u.id : (await bindings.findOne({ device_hash: deviceHash }))?.guest_id;
    } else {
      try {
        const r: any = await bindings.findOneAndUpdate(
          { device_hash: deviceHash },
          { $setOnInsert: { device_hash: deviceHash, guest_id: u.id, created_at: now, last_seen_at: now } },
          { upsert: true, returnDocument: 'after' },
        );
        winnerId = (r && 'value' in r && 'ok' in r ? r.value : r)?.guest_id;
      } catch (e: any) {
        if (e?.code !== 11000) throw e;
        winnerId = (await bindings.findOne({ device_hash: deviceHash }))?.guest_id;     // two upserts collided: the other one won
      }
    }
    if (winnerId && winnerId !== u.id) {
      await this.patientModel.deleteOne({ user_id: u.id }).catch(() => undefined);
      await this.userModel.deleteOne({ id: u.id }).catch(() => undefined);
      const winner = await this.userModel.findOne({ id: winnerId });
      if (winner?.is_guest === true) return { user: this.publicUser(winner), token: this.signToken(winner, device) };
      throw new ConflictException('guest_device_busy');       // the winner was converted in this instant: the caller retries
    }
    return { user: this.publicUser(u), token: this.signToken(u, device) };
  }

  /** Re-point a guest's data to another account (used by the merge path). */
  /**
   * 21.2 — after any sign-up or sign-in method produces an account, move the
   * guest's data into it.
   *
   * `guestToken` is the guest's OWN access token. `GuestService.proveGuestToken`
   * verifies its signature, expiry, `is_guest` flag and still-unmerged row, and
   * burns its jti. There is no path where a bare guest id moves data. A merge
   * failure never breaks the sign-in: the user is signed in and the reason is
   * logged.
   */
  private async mergeGuestAfterSignIn(guestToken: string | undefined, targetUserId: string) {
    if (!guestToken || !this.guests) return;
    try {
      const proof = await this.guests.proveGuestToken(guestToken);
      if (proof.guestAccountId === targetUserId) return;
      await this.guests.mergeGuestIntoAccount(proof, targetUserId);
    } catch (e: any) {
      // A bad, expired or replayed guest token simply means no merge.
      this.logger.warn(`guest merge skipped: ${e?.message}`);
    }
  }

  private async mergeGuestFromRequest(guestToken: string | undefined, targetUserId: string) {
    await this.mergeGuestAfterSignIn(guestToken, targetUserId);
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
      const policy = await this.passwordSecurity?.check(data.password);
      if (policy && !policy.ok) throw new BadRequestException({ message: policy.code, code: policy.code, statusCode: HttpStatus.BAD_REQUEST });
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

  async sendOtp(identifier: string, purpose?: string, ip?: string) {
    AuthService.assertString(identifier, 'identifier');
    const normalized = this.normalizeOtpIdentifier(identifier);
    const rateLimitKey = this.otpIssueRateKey(normalized);
    const maxAttempts = Number(process.env.OTP_ISSUE_LIMIT || 3);
    const windowSeconds = Number(process.env.OTP_ISSUE_WINDOW_SECONDS || 3600);

    const { allowed } = await this.redisService.checkRateLimit(rateLimitKey, maxAttempts, windowSeconds);
    if (!allowed) {
      throw new HttpException('Too many OTP requests. Please try again after 1 hour.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // 16.3: SMS pumping. A botnet asking for codes against numbers it does not
    // own burns the product's SMS budget, so the number must be on the served
    // list, one IP may only fan out over a bounded set of numbers, and the
    // daily budget stops sends rather than failing at the provider.
    const abuse = await this.otpAbuse?.check(normalized, ip);
    if (abuse && !abuse.allowed) {
      throw new HttpException(
        { message: abuse.code, code: abuse.code, statusCode: HttpStatus.TOO_MANY_REQUESTS },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isEmail = normalized.includes('@');
    const existing = await this.userModel.findOne(isEmail ? { email: normalized } : { phone: normalized });
    // Sign-up for an address that already has an account: say so now, not after the code step (issue 413). This
    // reveals nothing new: /auth/register answers the same 409 for the same identifier.
    if (existing && purpose === 'register') {
      throw new ConflictException({ message: 'identifier_already_registered', code: 'identifier_already_registered', statusCode: HttpStatus.CONFLICT });
    }
    if (!existing && purpose !== 'register') {
      // No account: same answer as a sent code, so this endpoint cannot be used to
      // test which emails/phones are registered. Nothing is stored or sent.
      return { ok: true, channel: isEmail ? 'email' : 'sms' };
    }
    // F63 registration: a new identifier must be able to receive the code that
    // /auth/register requires (the code goes to the identifier itself).
    const u: any = existing || { id: null, email: isEmail ? normalized : undefined, phone: isEmail ? undefined : normalized };

    this.events.emit('auth.otp_requested', { user_id: u.id ?? undefined, purpose: purpose || 'login', channel: isEmail ? 'email' : 'phone' });
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
        logEvent('warn', 'otp_no_delivery_channel', {}, 'auth');
      }
      if (!delivered.length) {
        throw new ServiceUnavailableException({ message: 'otp_channel_unavailable', code: 'otp_channel_unavailable' });
      }
      return { ok: true, channel: delivered[0] };
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err;
      logEvent('error', 'verification_code_send_failed', { error: (err as Error)?.message }, 'auth');
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

    // P17-17.9: the code is digits — normalize Arabic-Indic/Eastern
    // Arabic-Indic forms before comparing with the stored Latin hash.
    if (!(await bcrypt.compare(normalizeDigits(code).trim(), entry.code_hash))) {
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
    // P17-17.9: normalize before lookup (an Arabic-Indic phone must find the
    // Latin-stored account, exactly like the OTP identifier paths).
    const normalizedIdentifier = this.normalizeOtpIdentifier(identifier);
    const isEmail = normalizedIdentifier.includes('@');
    // 16.2: the new password follows the same rule as a registration, checked before the code is spent.
    const policy = await this.passwordSecurity?.check(newPassword);
    if (policy && !policy.ok) throw new BadRequestException({ message: policy.code, code: policy.code, statusCode: HttpStatus.BAD_REQUEST });
    const u = await this.userModel.findOne(isEmail ? { email: normalizedIdentifier } : { phone: normalizedIdentifier });
    // An unknown account answers exactly like a wrong code, so this endpoint cannot be used to find out who is registered.
    if (!u) throw new BadRequestException('Invalid OTP code');
    // Verify the OTP against the contact that actually received it.
    await this.verifyOtp(this.otpContact(u, identifier), code); // throws if invalid
    const hash = await bcrypt.hash(newPassword, 12);
    u.password_hash = hash;
    await u.save();
    // P3.0a: a reset must not leave stolen access/refresh tokens alive.
    await this.revokeAfterCredentialChange(u.id);
    this.events.emit('auth.password_changed', { user_id: u.id, role: u.role, how: 'reset_code' });
    return { ok: true };
  }

  /** The contact an OTP is keyed to — matches the channel the code was sent on. */
  private otpContact(u: any, identifier: string): string {
    if (identifier?.includes('@') && u?.email) return u.email;
    return u?.phone || u?.email || identifier;
  }

  async socialLogin(dto: { provider: 'google' | 'apple' | 'x' | 'snapchat'; token?: string; code?: string; code_verifier?: string; redirect_uri?: string; email?: string; name?: string }, guestToken?: string) {
    // Q107: the email comes only from a provider token whose signature and
    // audience were verified, never from the body. X and Snapchat had no
    // verification at all (unsigned JWT decode, or a made-up address).
    if (dto.provider === 'x' || dto.provider === 'snapchat') return this.subjectSocialLogin(dto.provider, dto, guestToken);
    let verified: { email: string; full_name: string } | null;
    if (!dto.token) throw new BadRequestException('social_token_required');
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
    // A banned or deactivated account never gets a token this way either.
    if (u && u.active === false) throw new ForbiddenException('account_disabled');
    if (!u) {
      // A first social sign-in creates an account: refused while new registrations are off.
      await this.killSwitches?.assertOn('new_registrations');
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

    // 21.6: a verified provider token is the ONLY proof for a provider link,
    // and it is minted here from the identity this method just verified.
    await this.recordProviderLinkProofs(u.id, dto.provider as 'google' | 'apple', email);

    // 21.2: a guest who signs in with Google keeps the cart and the orders.
    await this.mergeGuestFromRequest(guestToken, u.id);

    return { user: this.publicUser(u), token: this.signToken(u) };
  }

  /**
   * X and Snapchat: the access token is verified by asking the provider's own API who it belongs to. The identity is the
   * provider's stable account id (no email is taken from them), so a token can only ever open the account of the person
   * it was issued to and never an account that merely shares an address. Staff and provider accounts never get here.
   */
  private async subjectSocialLogin(provider: 'x' | 'snapchat', dto: { token?: string; code?: string; code_verifier?: string; redirect_uri?: string; name?: string }, guestToken?: string) {
    // A raw access token cannot be audience-checked (it names no client), so it is never accepted: the backend exchanges
    // the authorization code itself with OUR client id and secret, which makes the token ours by construction.
    if (dto.token) throw new BadRequestException('social_code_required');
    if (!dto.code || !dto.code_verifier || !dto.redirect_uri) throw new BadRequestException('social_code_required');
    const accessToken = await this.exchangeSocialCode(provider, dto.code, dto.code_verifier, dto.redirect_uri);
    const verified = provider === 'x' ? await this.verifyXToken(accessToken) : await this.verifySnapchatToken(accessToken);
    if (!verified) throw new UnauthorizedException('invalid_social_token');
    const nameIn = dto.name;
    const field = provider === 'x' ? 'social_x_id' : 'social_snapchat_id';
    let u = await this.userModel.findOne({ [field]: verified.subject });
    if (u && u.role !== UserRole.PATIENT) throw new ForbiddenException('password_login_required');
    if (u && u.active === false) throw new ForbiddenException('account_disabled');
    if (!u) {
      await this.killSwitches?.assertOn('new_registrations');
      u = await this.userModel.create({
        full_name: verified.full_name || nameIn || 'Social User',
        [field]: verified.subject,
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
    await this.mergeGuestFromRequest(guestToken, u.id);
    return { user: this.publicUser(u), token: this.signToken(u) };
  }

  /**
   * Authorization-code exchange at the provider's token endpoint with our own client credentials
   * (X_CLIENT_ID/X_CLIENT_SECRET, SNAPCHAT_CLIENT_ID/SNAPCHAT_CLIENT_SECRET). The redirect URI must be on the
   * SOCIAL_REDIRECT_URIS allow-list, and a code is accepted once (the provider also refuses a replay).
   */
  private async exchangeSocialCode(provider: 'x' | 'snapchat', code: string, verifier: string, redirectUri: string): Promise<string> {
    const prefix = provider === 'x' ? 'X' : 'SNAPCHAT';
    const clientId = process.env[`${prefix}_CLIENT_ID`];
    const secret = process.env[`${prefix}_CLIENT_SECRET`];
    const allowed = String(process.env.SOCIAL_REDIRECT_URIS || '').split(',').map((v) => v.trim()).filter(Boolean);
    if (!clientId || !secret || !allowed.length) throw new ServiceUnavailableException('social_login_not_configured');
    if (!allowed.includes(redirectUri)) throw new BadRequestException('redirect_uri_not_allowed');
    const codeKey = `social_code:${provider}:${createHash('sha256').update(code).digest('hex')}`;
    const redis = (this.redisService as any)?.getClient?.();
    if (redis) {
      const first = await redis.set(codeKey, '1', 'EX', 600, 'NX').catch(() => 'OK');
      if (first !== 'OK') throw new UnauthorizedException('invalid_social_token');
    }
    const url = provider === 'x' ? 'https://api.x.com/2/oauth2/token' : 'https://accounts.snapchat.com/login/oauth2/access_token';
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: verifier, client_id: clientId });
    try {
      const r = await timedFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}` },
        body: body.toString(),
      }, SOCIAL_FETCH);
      if (!r.ok) throw new UnauthorizedException('invalid_social_token');
      const out: any = await r.json();
      if (typeof out?.access_token !== 'string' || !out.access_token) throw new UnauthorizedException('invalid_social_token');
      return out.access_token;
    } catch (e) {
      if (e instanceof GatewayTimeoutException || e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('invalid_social_token');
    }
  }

  /** X OAuth 2.0 user access token: GET /2/users/me answers with the account it belongs to. */
  private async verifyXToken(token: string): Promise<{ subject: string; full_name: string } | null> {
    try {
      const r = await timedFetch('https://api.x.com/2/users/me?user.fields=name', { headers: { Authorization: `Bearer ${token}` } }, SOCIAL_FETCH);
      if (!r.ok) return null;
      const body: any = await r.json();
      const id = body?.data?.id;
      if (typeof id !== 'string' || !/^\d{1,25}$/.test(id)) return null;
      return { subject: id, full_name: typeof body.data.name === 'string' ? body.data.name.slice(0, 120) : '' };
    } catch (e) {
      if (e instanceof GatewayTimeoutException) throw e;
      return null;
    }
  }

  /** Snapchat Login Kit access token: the Snap Kit /me query answers with the account's external id and display name. */
  private async verifySnapchatToken(token: string): Promise<{ subject: string; full_name: string } | null> {
    try {
      const q = encodeURIComponent('{me{externalId displayName}}');
      const r = await timedFetch(`https://kit.snapchat.com/v1/me?query=${q}`, { headers: { Authorization: `Bearer ${token}` } }, SOCIAL_FETCH);
      if (!r.ok) return null;
      const body: any = await r.json();
      const me = body?.data?.me;
      const id = me?.externalId;
      if (typeof id !== 'string' || !id || id.length > 200) return null;
      return { subject: id, full_name: typeof me.displayName === 'string' ? me.displayName.slice(0, 120) : '' };
    } catch (e) {
      if (e instanceof GatewayTimeoutException) throw e;
      return null;
    }
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
      const info = await timedFetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`, undefined, SOCIAL_FETCH);
      if (!info.ok) return null;
      const p: any = await info.json();
      if (!allowed.includes(String(p.aud || '')) && !allowed.includes(String(p.azp || ''))) return null;
      if (!AuthService.emailVerified(p.email_verified) || typeof p.email !== 'string' || !p.email) return null;
      if (p.expires_in !== undefined && !(Number(p.expires_in) > 0)) return null;
      let fullName = '';
      const profile = await timedFetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } }, SOCIAL_FETCH).catch(() => null);
      if (profile?.ok) {
        const u: any = await profile.json().catch(() => ({}));
        fullName = u.name || `${u.given_name || ''} ${u.family_name || ''}`.trim();
      }
      return { email: p.email.toLowerCase(), full_name: fullName };
    } catch (e) {
      // A slow Google is not a wrong token: answer 504 so the app can offer a retry instead of "invalid token".
      if (e instanceof GatewayTimeoutException) throw e;
      return null;
    }
  }

  private static appleKeys: { at: number; keys: Map<string, KeyObject> } | null = null;

  /** Apple's signing keys (JWKS), cached for an hour. */
  private static async appleKey(kid: string): Promise<KeyObject | null> {
    const fresh = AuthService.appleKeys && Date.now() - AuthService.appleKeys.at < 3600_000;
    if (!fresh || !AuthService.appleKeys!.keys.has(kid)) {
      const r = await timedFetch('https://appleid.apple.com/auth/keys', undefined, SOCIAL_FETCH);
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
    } catch (e) {
      if (e instanceof GatewayTimeoutException) throw e;
      return null;
    }
  }
}
