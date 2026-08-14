import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../modules/redis/redis.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey || request.method !== 'POST') {
      return next.handle();
    }

    const cacheKey = `idempotency:${idempotencyKey}`;
    const cachedResponse = await this.redis.getClient().get(cacheKey);

    if (cachedResponse) {
      return of(JSON.parse(cachedResponse));
    }

    return next.handle().pipe(
      tap(async (response) => {
        // Cache the successful response for 24 hours
        await this.redis.getClient().set(cacheKey, JSON.stringify(response), 'EX', 86400);
      }),
    );
  }
}
