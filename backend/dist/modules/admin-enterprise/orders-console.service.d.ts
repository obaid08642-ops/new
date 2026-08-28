import { Connection } from 'mongoose';
import { AdminAuditService } from './audit.service';
import { WalletService } from '../wallet/wallet.service';
export interface OrderKindSpec {
    kind: string;
    collection: string;
    stateField: string;
    historyField: string;
    patientField: string;
    patientNameField?: string;
    providerField?: string;
    amountExpr: string;
    cancelledStates: string[];
    completedStates: string[];
    label_ar: string;
}
export declare const ORDER_KINDS: OrderKindSpec[];
export declare function getKindSpec(kind: string): OrderKindSpec;
export declare class OrdersConsoleService {
    private readonly conn;
    private readonly audit;
    private readonly wallet;
    constructor(conn: Connection, audit: AdminAuditService, wallet: WalletService);
    list(opts: {
        kind?: string;
        q?: string;
        status?: string;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
        sort?: string;
    }): Promise<{
        data: any[];
        total: number;
        page: number;
        pages: number;
        by_status: Record<string, number>;
        by_kind: Record<string, number>;
    }>;
    exportCsv(opts: {
        kind?: string;
        q?: string;
        status?: string;
        from?: string;
        to?: string;
    }): Promise<{
        filename: string;
        csv: string;
        truncated: boolean;
        total_matching: number;
        exported_rows: number;
    }>;
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
    private pushHistory;
    cancel(kind: string, id: string, rawReason: unknown, admin: any): Promise<{
        ok: boolean;
        id: string;
        previous_state: string;
        state: string;
    }>;
    refund(kind: string, id: string, body: {
        amount?: number;
        mode?: 'partial' | 'full';
        reason?: unknown;
    }, admin: any): Promise<{
        ok: boolean;
        id: string;
        credited_amount: number;
        refunded_total: number;
    }>;
    compensate(kind: string, id: string, body: {
        amount?: number;
        reason?: unknown;
    }, admin: any): Promise<{
        ok: boolean;
        id: string;
        compensated_amount: number;
    }>;
    reassign(kind: string, id: string, body: {
        provider_id?: string;
        reason?: unknown;
    }, admin: any): Promise<{
        ok: boolean;
        id: string;
        previous_provider: any;
        provider: string;
    }>;
    extendSla(kind: string, id: string, body: {
        hours?: number;
        reason?: unknown;
    }, admin: any): Promise<{
        ok: boolean;
        id: string;
        sla_due_at: Date;
        extended_hours: number;
    }>;
    addInternalNote(kind: string, id: string, rawNote: unknown, admin: any): Promise<{
        ok: boolean;
        id: string;
        note: {
            by_user_id: any;
            by_role: string;
            at: Date;
            note: string;
        };
    }>;
    private reason;
    private financialReason;
}
