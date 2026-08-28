import { Connection } from 'mongoose';
import { AdminAuditService } from './audit.service';
import { SeoService } from '../seo/seo.service';
import { Queue } from 'bullmq';
export declare class AdminOpsController {
    private readonly conn;
    private readonly notificationsQueue;
    private readonly audit;
    private readonly seoService;
    constructor(conn: Connection, notificationsQueue: Queue, audit: AdminAuditService, seoService: SeoService | null);
    queues(): Promise<{
        queues: {
            is_paused: boolean;
            name: string;
        }[];
    }>;
    jobs(name: string, state?: string, start?: string, end?: string): Promise<{
        data: {
            id: any;
            name: any;
            attempts: any;
            failedReason: any;
            data_preview: string;
            timestamp: any;
            processedOn: any;
            finishedOn: any;
        }[];
        state: string;
        total_shown: number;
    }>;
    retryJob(name: string, jobId: string, b: any, me: any): Promise<{
        ok: boolean;
        job_id: string;
        queue: string;
    }>;
    retryFailed(name: string, b: any, me: any): Promise<{
        ok: boolean;
        attempted: number;
        retried: number;
    }>;
    translations(lang?: string, missing?: string): Promise<{
        total_keys: number;
        data: any[];
        overridden_count: number;
    }>;
    upsertTranslation(b: any, me: any): Promise<{
        ok: boolean;
        key: string;
        values: any;
    }>;
    seoControls(): Promise<{
        data: import("bson").Document[];
        note: string;
    }>;
    setSeoControl(b: any, me: any): Promise<{
        ok: boolean;
        route_key: string;
        indexable: any;
    }>;
}
