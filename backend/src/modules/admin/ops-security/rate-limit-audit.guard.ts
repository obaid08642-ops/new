import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';

/**
 * D-34 — counts throttled (429) requests for the admin "Operations & Security"
 * page. The 429 is raised by this guard, which rejects before interceptors run,
 * so it is observed here instead. Observes only: the recorded row is written
 * first, then the identical error is rethrown, so responses never change.
 */
@Injectable()
export class RateLimitAuditGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    @InjectConnection() private readonly conn: Connection,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (e: any) {
      if (Number(e?.status) === 429) {
        try {
          const req = context.switchToHttp().getRequest();
          const path = String(req?.originalUrl || req?.url || '').split('?')[0];
          await this.conn.collection('security_events').insertOne({
            type: 'rate_limited', at: new Date(), path, message: 'too_many_requests',
          });
        } catch {
          // Observability must never break throttling on DB hiccups.
        }
      }
      throw e;
    }
  }
}
