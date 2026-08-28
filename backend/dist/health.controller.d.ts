import { Connection } from 'mongoose';
import { RedisService } from './modules/redis/redis.service';
export declare class HealthController {
    private readonly connection;
    private readonly redis;
    constructor(connection: Connection, redis: RedisService);
    root(): {
        app: string;
        status: string;
        time: string;
        version: string;
    };
    liveness(): {
        status: string;
    };
    health(): Promise<{
        status: string;
        time: string;
        uptime: number;
        details: {
            mongodb: string;
            redis: string;
        };
    }>;
}
