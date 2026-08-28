import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RedisService } from '../modules/redis/redis.service';
import { Reflector } from '@nestjs/core';
export declare const REQUIRE_IDEMPOTENCY = "require_idempotency";
export declare const RequireIdempotency: () => import("@nestjs/common").CustomDecorator<string>;
export declare class IdempotencyInterceptor implements NestInterceptor {
    private readonly redis;
    private readonly reflector;
    constructor(redis: RedisService, reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>>;
}
