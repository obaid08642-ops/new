import { Connection } from 'mongoose';
export interface DailyPoint {
    date: string;
    value: number;
}
export declare function zScoreAnomalies(series: DailyPoint[], opts?: {
    baselineDays?: number;
    threshold?: number;
    minBaseline?: number;
}): Array<{
    date: string;
    value: number;
    z: number;
    direction: 'spike' | 'drop';
}>;
export interface CohortResult {
    cohort: string;
    size: number;
    d1: number;
    d7: number;
    d30: number;
}
export declare function buildCohorts(signups: Array<{
    userId: string;
    at: Date;
}>, activityDays: Map<string, Set<string>>): CohortResult[];
export declare function funnelPct(stage: number, from: number): number | null;
export declare class AnalyticsSuiteService {
    private readonly conn;
    constructor(conn: Connection);
    private range;
    funnel(from: string, to: string): Promise<{
        range: {
            from: string;
            to: string;
        };
        channels: {
            conv_verified_pct: number;
            conv_first_pct: number;
            conv_repeat_pct: number;
            registered: number;
            verified: number;
            first_booking: number;
            repeat: number;
            channel: string;
        }[];
    }>;
    cohorts(from: string, to: string): Promise<{
        range: {
            from: string;
            to: string;
        };
        cohorts: {
            ltv_avg_payers: number;
            payers: number;
            cohort: string;
            size: number;
            d1: number;
            d7: number;
            d30: number;
        }[];
    }>;
    providerLeague(from: string, to: string, domain?: string): Promise<any[]>;
    searchAnalytics(from: string, to: string): Promise<{
        top_queries: any[] | import("bson").Document[];
        zero_result_opportunities: any[] | import("bson").Document[];
    }>;
    nps(from: string, to: string): Promise<{
        total: any;
        distribution: {
            [k: string]: any;
        };
        promoters: any;
        passives: any;
        detractors: any;
        nps: number;
    }>;
    anomalies(daysBack?: number): Promise<{
        cancellation_anomalies: {
            date: string;
            value: number;
            z: number;
            direction: "spike" | "drop";
        }[];
        payment_failure_anomalies: {
            date: string;
            value: number;
            z: number;
            direction: "spike" | "drop";
        }[];
        window_days: number;
    }>;
}
