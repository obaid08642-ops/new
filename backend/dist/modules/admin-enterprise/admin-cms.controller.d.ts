import { Connection } from 'mongoose';
import { AdminAuditService } from './audit.service';
export declare class AdminCmsController {
    private readonly conn;
    private readonly audit;
    private static EDITABLE;
    constructor(conn: Connection, audit: AdminAuditService);
    list(status?: string, q?: string, page?: string, limit?: string): Promise<{
        data: import("bson").Document[];
        total: number;
        page: number;
        pages: number;
    }>;
    upsert(b: any, me: any): Promise<any>;
    publish(id: string, b: any, me: any): Promise<{
        ok: boolean;
        id: string;
        status: string;
    }>;
    schedule(id: string, b: any, me: any): Promise<{
        ok: boolean;
        id: string;
        scheduled_at: string;
    }>;
    unpublish(id: string, b: any, me: any): Promise<{
        ok: boolean;
        id: string;
        status: string;
    }>;
}
