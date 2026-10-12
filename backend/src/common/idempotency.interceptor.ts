import { BadRequestException, CallHandler, ConflictException, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { RedisService } from '../modules/redis/redis.service';
import { Reflector } from '@nestjs/core';

export const REQUIRE_IDEMPOTENCY = 'require_idempotency';
export const RequireIdempotency = () => SetMetadata(REQUIRE_IDEMPOTENCY, true);

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService, private readonly reflector: Reflector) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];
    const isMutation = ['POST', 'PATCH', 'DELETE'].includes(request.method);
    const required = this.reflector.get<boolean>(REQUIRE_IDEMPOTENCY, context.getHandler()) === true;
    // This interceptor is registered BOTH globally and explicitly via
    // @UseInterceptors on some controllers (payments, moyasar, health,
    // medical-programs). Only the FIRST instance that sees a request may
    // process it; a second instance would find the first one's Redis lock
    // and self-conflict (409 on every keyed call). The per-request marker
    // keeps exactly-once processing while preserving replay protection for
    // every keyed mutation — including payment intent/retry, which rely on
    // the client-supplied key without carrying @RequireIdempotency().
    if (request.__idempotencyHandled) return next.handle();
    request.__idempotencyHandled = true;
    if (!idempotencyKey) {
      if (required && isMutation) throw new BadRequestException('idempotency_key_required');
      return next.handle();
    }
    if (!isMutation) return next.handle();

    if (typeof idempotencyKey !== 'string' || idempotencyKey.length > 128) {
      throw new BadRequestException('invalid_idempotency_key');
    }
    // Controllers using this interceptor are authenticated payment mutations.
    // Fail open only for routes without an authenticated identity rather than
    // allowing a cross-user cache key.
    if (!request.user?.id) return next.handle();

    const requestPath = request.originalUrl || request.url || '';
    const scope = `${request.user.id}:${request.method}:${requestPath}`;
    const cacheKey = `idempotency:${scope}:${idempotencyKey}`;
    const requestHash = createHash('sha256').update(JSON.stringify(request.body || {})).digest('hex');
    const redis = this.redis.getClient();
    const cachedResponse = await redis.get(cacheKey);

    // 15.2: a record WITHOUT a request_hash was written by an older writer and
    // carries no body to compare, so replaying it would answer a reused key
    // with a DIFFERENT body from the stale response instead of rejecting it.
    // Such a row is a MISS: the write executes and the persist below heals it
    // into the hashed shape, so the next replay is a real one.
    if (cachedResponse) {
      let cached: any;
      try {
        cached = JSON.parse(cachedResponse);
      } catch {
        cached = null;
      }
      if (typeof cached?.request_hash === 'string') {
        if (cached.request_hash !== requestHash) {
          throw new BadRequestException('idempotency_key_reused_with_different_request');
        }
        const response = cached?.response ?? cached;
        return of(response && typeof response === 'object' ? { ...response, idempotent_replay: true } : response);
      }
    }

    const lockKey = `${cacheKey}:lock`;
    const lockAcquired = await redis.set(lockKey, '1', 'EX', 120, 'NX');
    // Only the literal OK from SET NX means "the lock is mine"; anything else
    // (null on contention, an error string, an unexpected client reply) must
    // not let a second financial mutation through.
    if (lockAcquired !== 'OK') {
      // A parallel request with the same user/method/path/key must not execute
      // a second financial mutation before the first response is persisted.
      throw new ConflictException('idempotency_request_in_progress');
    }

    return next.handle().pipe(
      mergeMap(async (response) => {
        await redis.set(cacheKey, JSON.stringify({ request_hash: requestHash, response }), 'EX', 86400);
        await redis.del(lockKey);
        return response;
      }),
      catchError((error) => {
        // Errors are not cached and must release the in-flight key for a retry.
        return new Observable((subscriber) => {
          redis.del(lockKey).finally(() => subscriber.error(error));
        });
      }),
    );
  }
}
