import { Connection } from 'mongoose';
import { AnalyticsSuiteService } from './analytics-suite.service';
import { ScheduledReportsRunner } from './scheduled-reports.runner';
export declare class AdminAnalyticsSuiteController {
    private readonly svc;
    private readonly conn;
    constructor(svc: AnalyticsSuiteService, conn: Connection);
    funnels(from: string, to: string): Promise<{
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
    search(from: string, to: string): Promise<{
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
    anomalies(days?: string): Promise<{
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
export declare class AdminScheduledReportsController {
    private readonly conn;
    private readonly runner;
    constructor(conn: Connection, runner: ScheduledReportsRunner);
    list(): Promise<any[]>;
    create(b: any, me: any): Promise<any>;
    update(id: string, b: any, me: any): Promise<any>;
    runNow(id: string, me: any): Promise<{
        ok: boolean;
        detail: string;
        report: any;
        recipients: any;
    }>;
    runs(id: string): Promise<{
        data: import("bson").Document[];
    }>;
    remove(id: string, b: any, me: any): Promise<{
        ok: boolean;
    }>;
}
