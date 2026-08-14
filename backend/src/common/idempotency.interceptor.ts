import { CallHandler, ConflictException, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { RedisService } from '../modules/redis/redis.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = typeof request.headers['idempotency-key'] === 'string'
      ? request.headers['idempotency-key'].trim()
      : '';

    if (!idempotencyKey || idempotencyKey.length > 128 || request.method !== 'POST') {
      return next.handle();
    }

    const actorId = request.user?.id || request.user?.sub || 'anonymous';
    const route = request.originalUrl || request.url || 'unknown_route';
    const cacheKey = `idempotency:${actorId}:${request.method}:${route}:${idempotencyKey}`;
    const client = this.redis.getClient();
    const cachedResponse = await client.get(cacheKey);

    if (cachedResponse) {
      return of(JSON.parse(cachedResponse));
    }

    const lockKey = `${cacheKey}:lock`;
    const acquired = await client.set(lockKey, '1', 'EX', 60, 'NX');
    if (!acquired) throw new ConflictException('idempotency_request_in_progress');

    return next.handle().pipe(
      tap(async (response) => {
        // Cache the successful response for 24 hours
        await client.set(cacheKey, JSON.stringify(response), 'EX', 86400);
      }),
      finalize(() => { void client.del(lockKey); }),
    );
  }
}
