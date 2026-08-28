import { Connection } from 'mongoose';
import { AdminAuditService } from './audit.service';
export declare class AdminCrmController {
    private readonly conn;
    private readonly audit;
    constructor(conn: Connection, audit: AdminAuditService);
    searchPatients(q?: string, page?: string, limit?: string): Promise<{
        data: any[];
        total: number;
        page: number;
        pages: number;
    }>;
    patient360(id: string): Promise<{
        profile: any;
        bookings_by_kind: {
            kind: string;
            label_ar: string;
            rows: any[] | import("bson").Document[];
            count: number;
        }[];
        wallet: {
            balance: any;
            recent_transactions: any[] | import("bson").Document[];
        };
        support_tickets: any[] | import("bson").Document[];
        devices: any[] | import("bson").Document[];
        financial_summary: {
            lifetime_paid: number;
            paid_orders: any;
        };
    }>;
    impersonateLegacyDisabled(): never;
}
export declare class AdminGdprController {
    private readonly conn;
    private readonly audit;
    private static LIFECYCLE;
    constructor(conn: Connection, audit: AdminAuditService);
    list(status?: string, page?: string, limit?: string): Promise<{
        data: import("bson").Document[];
        total: number;
        page: number;
        pages: number;
        by_status: any;
    }>;
    createRequest(b: any, me: any): Promise<any>;
    start(id: string, me: any): Promise<any>;
    completeExport(id: string, me: any): Promise<{
        ok: boolean;
        id: string;
        export_ref: string;
        collections: string[];
    }>;
    completeDelete(id: string, me: any): Promise<{
        ok: boolean;
        id: string;
        anonymized_user_id: any;
    }>;
    private transition;
}
