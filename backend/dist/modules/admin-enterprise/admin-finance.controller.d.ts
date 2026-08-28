import { FinanceSuiteService, Granularity } from './finance-suite.service';
export declare class AdminFinanceSuiteController {
    private readonly svc;
    constructor(svc: FinanceSuiteService);
    revenue(from: string, to: string, granularity?: Granularity): Promise<{
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
    commissions(from: string, to: string): Promise<{
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
    updateConfig(b: any, me: any): Promise<any>;
    reconciliation(date: string): Promise<{
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
    payoutQueue(status?: string, page?: string, limit?: string): Promise<{
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
    approvePayout(id: string, b: any, me: any): Promise<{
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
    rejectPayout(id: string, b: any, me: any): Promise<{
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
