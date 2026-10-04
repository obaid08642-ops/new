import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RedisService } from '../modules/redis/redis.service';
import { Reflector } from '@nestjs/core';
import { IdempotencyKeyInterceptor } from './idempotency/idempotency-key.interceptor';
import { IdempotencyKeyStore, IDEMPOTENCY_MAX_KEY_LENGTH } from './idempotency/idempotency-key.store';

export const REQUIRE_IDEMPOTENCY = 'require_idempotency';
export const RequireIdempotency = () => SetMetadata(REQUIRE_IDEMPOTENCY, true);

/**
 * 15.2 merge: this global APP_INTERCEPTOR (also applied explicitly via
 * @UseInterceptors on payments, moyasar, health and medical-programs) is now
 * a thin contract layer over IdempotencyKeyInterceptor — the SINGLE Redis
 * protocol (key shape, lock NX 120s, response TTL 24h, replay flag).
 *
 * The two historical implementations used the same Redis key but different
 * per-request markers, so a request passing through BOTH (global + explicit
 * wiring) saw the first instance's lock as a conflict and answered 409 on
 * every keyed write. The base class now honours and sets both markers, so any
 * mix of wiring processes a request exactly once. This subclass adds only:
 * the @RequireIdempotency() enforcement (400 when a contract-required
 * mutation carries no key) and the strict key-shape rejection. Neither guard
 * is weakened: every keyed mutation still gets lock/replay/hash-match
 * deduplication from the base.
 */
@Injectable()
export class IdempotencyInterceptor extends IdempotencyKeyInterceptor implements NestInterceptor {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {
    // The client is resolved per call, not captured: RedisService.getClient()
    // flips between the live client and the in-memory fallback as connectivity
    // changes, and the previous implementation resolved it per request too.
    super(new IdempotencyKeyStore({
      get: (key: string) => redis.getClient().get(key),
      set: (key: string, value: string, ...args: Array<string | number>) =>
        redis.getClient().set(key, value, ...args),
      del: (key: string) => redis.getClient().del(key),
    }));
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const isMutation = request.method === 'POST' || request.method === 'PATCH' || request.method === 'DELETE';
    const required = this.reflector.get<boolean>(REQUIRE_IDEMPOTENCY, context.getHandler()) === true;
    const rawKey = request.headers?.['idempotency-key'];
    if (isMutation && required && !rawKey) {
      throw new BadRequestException('idempotency_key_required');
    }
    if (isMutation && typeof rawKey !== 'undefined'
      && (typeof rawKey !== 'string' || rawKey.length > IDEMPOTENCY_MAX_KEY_LENGTH)) {
      throw new BadRequestException('invalid_idempotency_key');
    }
    return super.intercept(context, next);
  }
}
