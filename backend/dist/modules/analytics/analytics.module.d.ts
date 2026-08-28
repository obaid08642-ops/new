import { Connection } from 'mongoose';
export declare class AdminAnalyticsService {
    private readonly conn;
    constructor(conn: Connection);
    private col;
    topSearched(limit?: number): Promise<import("bson").Document[]>;
    topOrderedMedicines(limit?: number): Promise<import("bson").Document[]>;
    topDoctors(limit?: number): Promise<import("bson").Document[]>;
    topPharmacies(limit?: number): Promise<import("bson").Document[]>;
    topServices(limit?: number): Promise<import("bson").Document[]>;
    overview(): Promise<{
        totals: {
            users: number;
            orders: number;
            appointments: number;
            carts: number;
        };
        conversion_rate: number;
        order_cancellation_rate: number;
        appointment_cancellation_rate: number;
        active_users: {
            dau: any;
            wau: any;
            mau: any;
        };
        retention_4w: {
            retained_users: any;
            note: string;
        };
    }>;
}
export declare class AdminAnalyticsController {
    private readonly svc;
    constructor(svc: AdminAnalyticsService);
    overview(): Promise<{
        totals: {
            users: number;
            orders: number;
            appointments: number;
            carts: number;
        };
        conversion_rate: number;
        order_cancellation_rate: number;
        appointment_cancellation_rate: number;
        active_users: {
            dau: any;
            wau: any;
            mau: any;
        };
        retention_4w: {
            retained_users: any;
            note: string;
        };
    }>;
    topSearched(limit?: string): Promise<import("bson").Document[]>;
    topMedicines(limit?: string): Promise<import("bson").Document[]>;
    topDoctors(limit?: string): Promise<import("bson").Document[]>;
    topPharmacies(limit?: string): Promise<import("bson").Document[]>;
    topServices(limit?: string): Promise<import("bson").Document[]>;
}
export declare class AnalyticsModule {
}
