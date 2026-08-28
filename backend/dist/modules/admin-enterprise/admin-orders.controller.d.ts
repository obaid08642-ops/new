import type { Response } from 'express';
import { OrdersConsoleService } from './orders-console.service';
export declare class AdminOrdersConsoleController {
    private readonly svc;
    constructor(svc: OrdersConsoleService);
    list(kind?: string, q?: string, status?: string, from?: string, to?: string, page?: string, limit?: string, sort?: string): Promise<{
        data: any[];
        total: number;
        page: number;
        pages: number;
        by_status: Record<string, number>;
        by_kind: Record<string, number>;
    }>;
    exportCsv(kind: string | undefined, q: string | undefined, status: string | undefined, from: string | undefined, to: string | undefined, res: Response): Promise<string>;
    detail(kind: string, id: string): Promise<{
        order: any;
        kind: string;
        kind_label_ar: string;
        timeline: any;
        payments: any[] | import("bson").Document[];
        financials: {
            gross_paid: number;
            refunded_total: number;
            refundable_max: number;
        };
        refunds: import("bson").Document[];
    }>;
    cancel(kind: string, id: string, b: any, me: any): Promise<{
        ok: boolean;
        id: string;
        previous_state: string;
        state: string;
    }>;
    refund(kind: string, id: string, b: any, me: any): Promise<{
        ok: boolean;
        id: string;
        credited_amount: number;
        refunded_total: number;
    }>;
    compensate(kind: string, id: string, b: any, me: any): Promise<{
        ok: boolean;
        id: string;
        compensated_amount: number;
    }>;
    reassign(kind: string, id: string, b: any, me: any): Promise<{
        ok: boolean;
        id: string;
        previous_provider: any;
        provider: string;
    }>;
    addInternalNote(kind: string, id: string, b: any, me: any): Promise<{
        ok: boolean;
        id: string;
        note: {
            by_user_id: any;
            by_role: string;
            at: Date;
            note: string;
        };
    }>;
    slaExtend(kind: string, id: string, b: any, me: any): Promise<{
        ok: boolean;
        id: string;
        sla_due_at: Date;
        extended_hours: number;
    }>;
}
