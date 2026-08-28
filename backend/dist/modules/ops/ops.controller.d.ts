import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';
export declare class OpsController {
    private readonly conn;
    private readonly redis;
    constructor(conn: Connection, redis: RedisService);
    private client;
    private scanKeys;
    overview(): Promise<{
        generated_at: string;
        online: {
            users: number;
            admin_sessions: number;
        };
        today: {
            total_requests: number;
            success: number;
            client_errors: number;
            server_errors: number;
            success_rate: number;
        };
        top_endpoints: {
            path: string;
            count: number;
        }[];
        top_failing: {
            path: string;
            class: string;
            count: number;
        }[];
        pipelines: {
            orders: {
                by_status: Record<string, number>;
                created_today: number;
                late: number;
            };
            appointments: {
                by_status: Record<string, number>;
                created_today: number;
                late: number;
            };
            emergency: {
                by_status: Record<string, number>;
                created_today: number;
                late: number;
            };
            procurement: {
                by_status: Record<string, number>;
                created_today: number;
                late: number;
            };
            pharmacy_orders: {
                by_status: Record<string, number>;
                created_today: number;
                late: number;
            };
        };
        recent_activity: any[];
    }>;
    requests(kind?: string, limit?: string): Promise<{
        data: any[];
        counts: {
            total: number;
            pending: number;
            late: number;
            done: number;
            failed: number;
        };
    }>;
    traffic(date?: string): Promise<{
        date: string;
        by_path: any;
        by_status: any;
    }>;
}
