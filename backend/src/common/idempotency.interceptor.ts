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
    const cachedResponse = await this.redis.getClient().get(cacheKey);

    if (cachedResponse) {
      const cached = JSON.parse(cachedResponse);
      // Compatibility with records written by the former interceptor is kept
      // only inside the new user/path scope; new records always carry a hash.
      if (cached?.request_hash && cached.request_hash !== requestHash) {
        throw new BadRequestException('idempotency_key_reused_with_different_request');
      }
      const response = cached?.response ?? cached;
      return of(response && typeof response === 'object' ? { ...response, idempotent_replay: true } : response);
    }

    const lockKey = `${cacheKey}:lock`;
    const lockAcquired = await redis.set(lockKey, '1', 'EX', 120, 'NX');
    if (!lockAcquired) {
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
