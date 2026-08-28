import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';
export declare class HealthDashboardController {
    private readonly conn;
    private readonly redis;
    constructor(conn: Connection, redis: RedisService);
    private probe;
    dashboard(): Promise<{
        generated_at: string;
        elapsed_ms: number;
        services: {
            mongodb: {
                status: "up" | "down";
                latency_ms: number | null;
            };
            redis: {
                status: "up" | "down";
                latency_ms: number | null;
            };
            livekit: {
                status: "up" | "down";
                latency_ms: number | null;
            };
            coturn: {
                status: "up" | "down";
                latency_ms: number | null;
            };
            r2: {
                configured: boolean;
                bucket: string;
                status: "up" | "down";
                latency_ms: number | null;
            };
            fcm: {
                configured: boolean;
                status: "up" | "down";
                latency_ms: number | null;
            };
            resend: {
                configured: boolean;
                status: "up" | "down";
                latency_ms: number | null;
            };
        };
        metrics: {
            users_total: number;
            websocket_connections: any;
            active_calls: number;
            open_orders: number;
            open_carts: number;
            medicines_total: number;
            pending_shortage_reports: number;
            pending_image_suggestions: number;
            db_size_mb: number;
            db_storage_mb: number;
        };
        queues: any;
        crons: {
            name: string;
            schedule: string;
            status: string;
        }[];
        recent_errors: any[] | import("bson").Document[];
        host_note: string;
    }>;
}
