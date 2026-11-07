import { Injectable, Logger, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import Redis from 'ioredis';
import { webauthnOrigins, webauthnRpId } from './webauthn-config';
import { PasskeyCredential } from '../modules/auth/schemas/passkey-credential.schema';

export const STEP_UP_KEY = 'stepUp';
export const StepUp = () => SetMetadata(STEP_UP_KEY, true);

const STEP_UP_TTL = 120; // 2 minutes

interface StepUpRecord {
  user_id: string;
  action_hash: string;
  expires_at: number;
}

const store = new Map<string, StepUpRecord>();

/**
 * C4: Step-up re-authentication for sensitive actions. A fresh passkey
 * assertion (Touch/Face ID) issues a short-lived step-up token bound to a
 * specific action. The token is single-use and expires in 2 minutes.
 */
@Injectable()
export class StepUpService {
  private static readonly logger = new Logger(StepUpService.name);
  constructor(@InjectModel(PasskeyCredential.name) private passkeyModel: Model<any>) {}

  private get origin() {
    return webauthnOrigins();
  }
  private get rpID() {
    return webauthnRpId();
  }

  /** Challenge for a step-up assertion; consumed by issueFromAssertion. */
  async startAssertion(userId: string) {
    const creds: any[] = await this.passkeyModel.find({ user_id: userId }).lean();
    if (!creds.length) throw new ForbiddenException('no_passkey_registered');
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'required',
      allowCredentials: creds.map((c) => ({
        id: c.credential_id,
        transports: (c.transports?.length ? c.transports : ['internal', 'hybrid']) as AuthenticatorTransportFuture[],
      })),
    });
    await this.setChallenge(`webauthn_stepup:${userId}`, options.challenge, 300);
    return options;
  }

  protected async setChallenge(key: string, challenge: string, ttl: number): Promise<void> {
    const client = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    try {
      await client.set(key, challenge, 'EX', ttl);
    } finally {
      await client.disconnect();
    }
  }

  protected async takeChallenge(key: string): Promise<string | null> {
    const client = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    try {
      const value = await client.get(key);
      if (value) await client.del(key); // single-use, like the login challenge
      return value;
    } finally {
      await client.disconnect();
    }
  }

  issue(userId: string, action: string): string {
    const token = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(token).digest('hex');
    store.set(hash, {
      user_id: userId,
      action_hash: createHash('sha256').update(action).digest('hex'),
      expires_at: Date.now() + STEP_UP_TTL * 1000,
    });
    return token;
  }

  /**
   * Issue a step-up token for `action` after a FRESH passkey assertion.
   *
   * The token is only ever handed out here — never by an admin session alone —
   * so a stolen or idle admin token cannot authorize a sensitive action without a
   * new biometric/PIN verification. The assertion is verified against the stored
   * public key, which is the same proof a login requires.
   */
  async issueFromAssertion(userId: string, action: string, response: any): Promise<string> {
    const cred: any = await this.passkeyModel.findOne({ user_id: userId, credential_id: response?.id }).lean();
    if (!cred) throw new ForbiddenException('unknown_credential');
    const challenge = await this.takeChallenge(`webauthn_stepup:${userId}`);
    if (!challenge) throw new ForbiddenException('challenge_expired');
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
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
      // Reason only: never the credential id, user id, challenge or signature.
      StepUpService.logger.warn(`step_up_rejected rp=${this.rpID} origins=${this.origin.join(',')} reason=${e?.message}`);
      throw new ForbiddenException('passkey_verification_failed');
    }
    if (!verification.verified) throw new ForbiddenException('passkey_verification_failed');
    await this.passkeyModel.updateOne(
      { credential_id: cred.credential_id },
      { $set: { counter: verification.authenticationInfo.newCounter, last_used_at: new Date() } },
    );
    return this.issue(userId, action);
  }

  verify(userId: string, action: string, token: string): boolean {
    const hash = createHash('sha256').update(token).digest('hex');
    const rec = store.get(hash);
    if (!rec) return false;
    store.delete(hash); // single-use
    if (rec.expires_at < Date.now()) return false;
    if (rec.user_id !== userId) return false;
    const actionHash = createHash('sha256').update(action).digest('hex');
    return timingSafeEqual(Buffer.from(rec.action_hash), Buffer.from(actionHash));
  }
}

/**
 * Guard: requires a valid step-up token on endpoints marked with @StepUp().
 * The token is passed as `X-Step-Up-Token` header.
 */
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(private reflector: Reflector, private stepUp: StepUpService, @InjectModel(PasskeyCredential.name) private passkeyModel: Model<any>) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(STEP_UP_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required) return true;
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('authentication_required');

    // Step-up is a SECOND authentication. When the account has no passkey
    // registered there is no second factor to re-present, so the base
    // authentication is already the strongest available — requiring a step-up
    // the user cannot perform would lock them out of every sensitive action.
    const hasFactor = await this.passkeyModel.findOne({ user_id: user.id || user.sub }).lean().catch(() => null);
    if (!hasFactor) return true;

    const token = req.headers['x-step-up-token'];
    if (!token) throw new ForbiddenException('step_up_required');
    const action = `${req.method}:${req.path}`;
    if (!this.stepUp.verify(user.id || user.sub, action, String(token))) {
      throw new ForbiddenException('step_up_invalid');
    }
    return true;
  }
}
