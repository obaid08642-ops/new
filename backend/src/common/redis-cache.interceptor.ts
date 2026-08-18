import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../modules/redis/redis.service';

@Injectable()
export class RedisCacheInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    
    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Skip caching if Authorization header is present (unless specifically designed for it)
    if (request.headers.authorization) {
      return next.handle();
    }

    const cacheKey = `http_cache:${request.originalUrl}`;
    const cachedResponse = await this.redis.getClient().get(cacheKey);

    if (cachedResponse) {
      return of(JSON.parse(cachedResponse));
    }

    return next.handle().pipe(
      tap(async (response) => {
        // Cache successful public GET responses for 5 minutes
        if (response) {
          await this.redis.getClient().set(cacheKey, JSON.stringify(response), 'EX', 300);
        }
      }),
    );
  }
}
