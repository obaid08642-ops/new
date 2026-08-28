import { NestMiddleware, MiddlewareConsumer } from '@nestjs/common';
import { Connection } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../redis/redis.service';
export declare class ApiSecurityService {
    private readonly redis;
    private readonly conn;
    private readonly logger;
    constructor(redis: RedisService, conn: Connection);
    private get events();
    private client;
    logEvent(type: string, req: Partial<Request>, extra?: Record<string, any>): Promise<void>;
    isBlacklisted(ip: string, deviceId?: string): Promise<boolean>;
    blacklist(key: string, reason: string, ttlSeconds?: number): Promise<void>;
    checkRate(req: Request, userId?: string): Promise<{
        allowed: boolean;
        className: string;
        retryAfter?: number;
    }>;
}
export declare class ApiSecurityMiddleware implements NestMiddleware {
    private readonly sec;
    constructor(sec: ApiSecurityService);
    use(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>>>;
}
export declare class ApiSecurityController {
    private readonly sec;
    constructor(sec: ApiSecurityService);
    events(): Promise<{
        data: any;
        counts: any;
    }>;
    clear(body: {
        key: string;
    }): Promise<{
        ok: boolean;
    }>;
}
export declare class ApiSecurityModule {
    configure(consumer: MiddlewareConsumer): void;
}
