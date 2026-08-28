import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RedisService } from '../redis/redis.service';
export declare class MetricsInterceptor implements NestInterceptor {
    private readonly redis;
    constructor(redis: RedisService);
    private normalize;
    intercept(ctx: ExecutionContext, next: CallHandler): Observable<any>;
}
