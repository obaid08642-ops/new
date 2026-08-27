import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { PasskeyCredential } from './schemas/passkey-credential.schema';
import { User } from '../../schemas/user.schema';
import { RedisService } from '../redis/redis.service';

const ENROLL_CHAL_TTL = 300; // 5 minutes
const LOGIN_CHAL_TTL = 300;

/**
 * Passkey / WebAuthn second factor for the Admin Dashboard.
 *
 * Strict workflow (no bypass):
 *  - Login challenge is issued ONLY from AuthService.login() AFTER the password
 *    has been verified — there is no public endpoint that hands out login
 *    challenges without a valid password first.
 *  - Enrollment requires an authenticated session AND the designated admin email
 *    (ADMIN_PASSKEY_EMAIL) AND role admin/super_admin.
 */
@Injectable()
export class PasskeyService {
  constructor(
    @InjectModel(PasskeyCredential.name) private passkeyModel: Model<PasskeyCredential>,
    @InjectModel(User.name) private userModel: Model<User>,
    private redisService: RedisService,
  ) {}

  private get rpID() {
    return process.env.WEBAUTHN_RP_ID || 'nabd.plus';
  }
  private get rpName() {
    return process.env.WEBAUTHN_RP_NAME || 'Nabd Admin';
  }
  private get origin() {
    return (process.env.WEBAUTHN_ORIGIN || 'https://admin.nabd.plus').split(',').map((s) => s.trim());
  }
  /** The single admin email subject to mandatory Passkey 2FA. */
  get designatedEmail() {
    return (process.env.ADMIN_PASSKEY_EMAIL || 'Obaid08642@gmail.com').trim().toLowerCase();
  }

  /**
   * Enrollment gate: designated admin email + admin role. The JWT payload does
   * NOT carry the email (only id/role) — always resolve the fresh user record
   * from the database so the check cannot be bypassed with a stale token.
   */
  async assertEnrollmentAllowed(user: any) {
    const dbUser: any = await this.userModel.findOne({ id: user?.id }).lean();
    const email = (dbUser?.email || '').trim().toLowerCase();
    const role = dbUser?.role || user?.role;
    if (email !== this.designatedEmail) throw new ForbiddenException('passkey_enroll_not_allowed');
    if (role !== 'admin' && role !== 'super_admin') throw new ForbiddenException('admin_only');
    return dbUser;
  }

  async countCredentials(userId: string): Promise<number> {
    return this.passkeyModel.countDocuments({ user_id: userId });
  }

  async listCredentials(userId: string) {
    const docs = await this.passkeyModel.find({ user_id: userId }).sort({ createdAt: -1 }).lean();
    return docs.map((d: any) => ({
      credential_id: d.credential_id,
      device_name: d.device_name,
      created_at: d.createdAt,
      last_used_at: d.last_used_at,
    }));
  }

  async removeCredential(userId: string, credentialId: string) {
    const count = await this.countCredentials(userId);
    if (count <= 1) throw new BadRequestException('cannot_remove_last_passkey');
    const res = await this.passkeyModel.deleteOne({ user_id: userId, credential_id: credentialId });
    if (!res.deletedCount) throw new BadRequestException('credential_not_found');
    return { ok: true };
  }

  // ── Enrollment ────────────────────────────────────────────────────────────

  async startEnrollment(user: any) {
    const dbUser = await this.assertEnrollmentAllowed(user);
    const existing = await this.passkeyModel.find({ user_id: user.id }).lean();
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: (dbUser?.email || user.id).toLowerCase(),
      userDisplayName: dbUser?.full_name || dbUser?.email || 'Admin',
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
      },
      // 'hybrid' enables cross-device QR (enroll from an old Mac via iPhone camera)
      excludeCredentials: existing.map((c: any) => ({
        id: c.credential_id,
        transports: (c.transports || []) as AuthenticatorTransportFuture[],
      })),
      supportedAlgorithmIDs: [-7, -257],
    });
    await this.setChallenge(`webauthn_enroll:${user.id}`, options.challenge, ENROLL_CHAL_TTL);
    return options;
  }

  async finishEnrollment(user: any, response: RegistrationResponseJSON, deviceName?: string) {
    await this.assertEnrollmentAllowed(user);
    const expectedChallenge = await this.takeChallenge(`webauthn_enroll:${user.id}`);
    if (!expectedChallenge) throw new UnauthorizedException('challenge_expired');
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: true,
      });
    } catch (e: any) {
      // TEMP-DIAG: surface the real simplewebauthn failure reason in container logs
      console.error('PASSKEY_ENROLL_VERIFY_FAIL', e?.message, JSON.stringify({ rpID: this.rpID, origin: this.origin }));
      throw new UnauthorizedException('passkey_verification_failed');
    }
    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException('passkey_verification_failed');
    }
    const { credential } = verification.registrationInfo;
    const already = await this.passkeyModel.findOne({ credential_id: credential.id });
    if (already) throw new BadRequestException('credential_already_registered');
    await this.passkeyModel.create({
      user_id: user.id,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey),
      counter: credential.counter || 0,
      transports: (credential.transports as string[]) || [],
      device_name: (deviceName || '').slice(0, 80),
      last_used_at: new Date(),
    });
    return { ok: true, credential_id: credential.id };
  }

  // ── Login (second factor) ─────────────────────────────────────────────────

  /**
   * Called ONLY from AuthService.login() after the password has been verified.
   * Never expose this through a public controller route directly.
   */
  async startLogin(user: any) {
    const creds = await this.passkeyModel.find({ user_id: user.id }).lean();
    if (!creds.length) throw new BadRequestException('no_passkey_registered');
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'required',
      allowCredentials: creds.map((c: any) => ({
        id: c.credential_id,
        transports: (c.transports?.length ? c.transports : ['internal', 'hybrid']) as AuthenticatorTransportFuture[],
      })),
    });
    await this.setChallenge(`webauthn_login:${user.id}`, options.challenge, LOGIN_CHAL_TTL);
    return options;
  }

  /** Verify an assertion; returns the owning user_id on success. */
  async finishLogin(response: AuthenticationResponseJSON): Promise<string> {
    const cred: any = await this.passkeyModel.findOne({ credential_id: response?.id }).lean();
    if (!cred) throw new UnauthorizedException('unknown_credential');
    const expectedChallenge = await this.takeChallenge(`webauthn_login:${cred.user_id}`);
    if (!expectedChallenge) throw new UnauthorizedException('challenge_expired');
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: true,
        credential: {
          id: cred.credential_id,
          publicKey: new Uint8Array(cred.public_key),
          counter: cred.counter || 0,
          transports: (cred.transports || []) as AuthenticatorTransportFuture[],
        },
      });
    } catch (e: any) {
      // TEMP-DIAG: surface the real simplewebauthn failure reason in container logs
      console.error('PASSKEY_LOGIN_VERIFY_FAIL', e?.message, JSON.stringify({ rpID: this.rpID, origin: this.origin, cred_user: cred?.user_id }));
      throw new UnauthorizedException('passkey_verification_failed');
    }
    if (!verification.verified) throw new UnauthorizedException('passkey_verification_failed');
    await this.passkeyModel.updateOne(
      { credential_id: cred.credential_id },
      { $set: { counter: verification.authenticationInfo.newCounter, last_used_at: new Date() } },
    );
    return cred.user_id;
  }

  // ── Redis challenge storage (single-use) ──────────────────────────────────

  private async setChallenge(key: string, challenge: string, ttl: number) {
    const client = (this.redisService as any).getClient?.();
    if (!client) throw new BadRequestException('challenge_store_unavailable');
    await client.set(key, challenge, 'EX', ttl);
  }

  /** Read-and-delete so a challenge can never be replayed. */
  private async takeChallenge(key: string): Promise<string | null> {
    const client = (this.redisService as any).getClient?.();
    if (!client) return null;
    const val = await client.get(key);
    if (val) await client.del(key);
    return val;
  }
}
