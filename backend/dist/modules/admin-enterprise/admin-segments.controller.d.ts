import { Connection } from 'mongoose';
import { AdminAuditService } from './audit.service';
export declare class AdminSegmentsController {
    private readonly conn;
    private readonly audit;
    constructor(conn: Connection, audit: AdminAuditService);
    fields(): {
        allowed_fields: readonly string[];
    };
    list(): Promise<any[]>;
    preview(b: any): Promise<{
        count: number;
        sample: import("bson").Document[];
        compiled_filter: Record<string, any>;
    }>;
    create(b: any, me: any): Promise<any>;
    remove(id: string, b: any, me: any): Promise<{
        ok: boolean;
    }>;
    members(id: string, page?: string, limit?: string): Promise<{
        segment: {
            id: any;
            name_ar: any;
        };
        data: import("bson").Document[];
        total: number;
        page: number;
        pages: number;
    }>;
}
