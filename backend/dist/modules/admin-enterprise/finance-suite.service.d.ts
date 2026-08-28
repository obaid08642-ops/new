import { Connection } from 'mongoose';
import { AdminAuditService } from './audit.service';
export type Granularity = 'day' | 'week' | 'month';
export declare function bucketKey(d: Date, g: Granularity): string;
export interface RevenueRow {
    bucket: string;
    vertical: string;
    gross: number;
    count: number;
}
export declare function seriesToRows(payments: Array<{
    paid_at?: Date;
    createdAt?: Date;
    amount?: number;
    booking_kind?: string;
}>, g: Granularity): RevenueRow[];
export declare function momComparison(rows: RevenueRow[], from: Date, to: Date, prevRows: RevenueRow[]): {
    vertical: string;
    current: number;
    previous: number;
    delta_pct: number | null;
}[];
export declare class FinanceSuiteService {
    private readonly conn;
    private readonly audit;
    constructor(conn: Connection, audit: AdminAuditService);
    revenue(opts: {
        from: string;
        to: string;
        granularity: Granularity;
    }): Promise<{
        granularity: Granularity;
        range: {
            from: string;
            to: string;
        };
        series: any[];
        mom: {
            vertical: string;
            current: number;
            previous: number;
            delta_pct: number | null;
        }[];
        refunds: {
            gateway_refunded: number;
            wallet_credits_issued: number;
        };
        totals: Record<string, number>;
    }>;
    commissions(opts: {
        from: string;
        to: string;
    }): Promise<{
        config_used: {
            rates: Record<string, number>;
            vat_rate: number;
            source: string;
        };
        by_vertical: {
            [k: string]: {
                [k: string]: number;
            };
        };
        totals: {
            [k: string]: number;
        };
    }>;
    upsertCommissionConfig(body: {
        rates?: Record<string, number>;
        vat_rate?: number;
    }, admin: any, rawReason: unknown): Promise<any>;
    reconciliation(dateStr: string): Promise<{
        date: string;
        gateway_total_sar: number;
        platform_total_sar: number;
        variance_sar: number;
        gateway_rows: {
            kind: any;
            total: any;
            count: any;
        }[];
        platform_rows: any[];
        note: string;
    }>;
    private get withdrawals();
    private dualThreshold;
    payoutQueue(status?: string, page?: number, limit?: number): Promise<{
        data: import("bson").Document[];
        total: number;
        page: number;
        pages: number;
        dual_approval_threshold_sar: number;
        by_state: {
            state: any;
            count: any;
            amount: any;
        }[];
    }>;
    approvePayout(id: string, admin: any, rawReason: unknown, decision: 'approve' | 'reject'): Promise<{
        ok: boolean;
        id: string;
        state: string;
        message?: undefined;
    } | {
        ok: boolean;
        id: string;
        state: string;
        message: string;
    }>;
    providerStatement(providerId: string, from?: string, to?: string): Promise<{
        provider_id: string;
        summary: {
            [k: string]: number;
        };
        balance_available: number;
        ledger: import("bson").Document[];
        payouts: import("bson").Document[];
    }>;
}
