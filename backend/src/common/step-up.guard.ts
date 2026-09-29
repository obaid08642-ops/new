import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

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
  constructor(private reflector: Reflector, private stepUp: StepUpService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(STEP_UP_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required) return true;
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('authentication_required');
    const token = req.headers['x-step-up-token'];
    if (!token) throw new ForbiddenException('step_up_required');
    const action = `${req.method}:${req.path}`;
    if (!this.stepUp.verify(user.id || user.sub, action, String(token))) {
      throw new ForbiddenException('step_up_invalid');
    }
    return true;
  }
}
