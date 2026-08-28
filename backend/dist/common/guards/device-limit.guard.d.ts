import { CanActivate, ExecutionContext } from '@nestjs/common';
import { RedisService } from '../../modules/redis/redis.service';
export declare class DeviceLimitGuard implements CanActivate {
    private readonly redisService;
    constructor(redisService: RedisService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
