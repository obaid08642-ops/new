import { HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';
export declare class SystemHealthController {
    private health;
    private mongoose;
    private redisService;
    constructor(health: HealthCheckService, mongoose: MongooseHealthIndicator, redisService: RedisService);
    checkLiveness(): Promise<import("@nestjs/terminus").HealthCheckResult<import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & {
        redis: {
            status: "up" | "down";
        };
    } & import("@nestjs/terminus").HealthIndicatorResult<"mongodb">, Partial<import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & {
        redis: {
            status: "up" | "down";
        };
    } & import("@nestjs/terminus").HealthIndicatorResult<"mongodb">>, Partial<import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & {
        redis: {
            status: "up" | "down";
        };
    } & import("@nestjs/terminus").HealthIndicatorResult<"mongodb">>>>;
    checkReadiness(): Promise<{
        uptime: number;
        status: import("@nestjs/terminus").HealthCheckStatus;
        info?: Partial<import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & {
            redis: {
                status: "up" | "down";
            };
        } & import("@nestjs/terminus").HealthIndicatorResult<"mongodb">>;
        error?: Partial<import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & {
            redis: {
                status: "up" | "down";
            };
        } & import("@nestjs/terminus").HealthIndicatorResult<"mongodb">>;
        details: import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & {
            redis: {
                status: "up" | "down";
            };
        } & import("@nestjs/terminus").HealthIndicatorResult<"mongodb">;
    }>;
}
