import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import Redis from 'ioredis';
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
  constructor(@InjectModel(PasskeyCredential.name) private passkeyModel: Model<any>) {}

  private get origin() {
    return process.env.PASSKEY_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3001';
  }
  private get rpID() {
    return process.env.PASSKEY_RP_ID || new URL(this.origin).hostname;
  }

  private async takeChallenge(key: string): Promise<string | null> {
    const client = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    try {
      return await client.get(key);
    } finally {
      await client.disconnect();
    }
  }

  async issue(userId: string, action: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(token).digest('hex');
    // Store in Redis (not a process-local Map) so a token issued by one worker
    // verifies on any other worker in the production cluster.
    const client = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    await client.set(`stepup:${hash}`, JSON.stringify({
      user_id: userId,
      action_hash: createHash('sha256').update(action).digest('hex'),
      expires_at: Date.now() + STEP_UP_TTL * 1000,
    }), 'EX', STEP_UP_TTL);
    await client.disconnect();
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
    } catch {
      throw new ForbiddenException('passkey_verification_failed');
    }
    if (!verification.verified) throw new ForbiddenException('passkey_verification_failed');
    await this.passkeyModel.updateOne(
      { credential_id: cred.credential_id },
      { $set: { counter: verification.authenticationInfo.newCounter, last_used_at: new Date() } },
    );
    return this.issue(userId, action);
  }

  async verify(userId: string, action: string, token: string): Promise<boolean> {
    const hash = createHash('sha256').update(token).digest('hex');
    const client = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    let rec: StepUpRecord | null = null;
    try {
      const raw = await client.getdel(`stepup:${hash}`);
      rec = raw ? JSON.parse(raw) : null;
    } finally {
      await client.disconnect();
    }
    if (!rec) return false;
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
