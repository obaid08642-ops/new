import { Document } from 'mongoose';
import { Connection } from 'mongoose';
import { PushService } from '../push/push.module';
export declare class Campaign {
    id: string;
    name: string;
    title: string;
    body: string;
    segment: string;
    deep_link?: {
        route: string;
        params?: Record<string, any>;
    };
    scheduled_at?: Date;
    status: string;
    stats: {
        targeted?: number;
        sent?: number;
        failed?: number;
    };
    sent_at?: Date;
    created_by?: string;
    last_error?: string;
}
export type CampaignDocument = Campaign & Document;
export declare const CampaignSchema: import("mongoose").Schema<Campaign, import("mongoose").Model<Campaign, any, any, any, Document<unknown, any, Campaign, any, {}> & Campaign & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Campaign, Document<unknown, {}, import("mongoose").FlatRecord<Campaign>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Campaign> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class AdminNotificationCenterService {
    private readonly conn;
    private readonly push;
    private readonly logger;
    constructor(conn: Connection, push: PushService);
    private get campaigns();
    private get users();
    private get engagements();
    private get pushLogs();
    private validateCampaignInput;
    resolveSegment(segment: string): Promise<string[]>;
    private usersByRole;
    segmentCounts(): Promise<{
        all: number;
        patients: number;
        providers: number;
        by_role: Record<string, number>;
    }>;
    createCampaign(adminId: string, body: any): Promise<{
        ok: boolean;
        campaign: {
            id: string;
            name: string;
            title: string;
            body: string;
            segment: string;
            deep_link: any;
            variants: any;
            scheduled_at: Date;
            status: string;
            stats: {};
            created_by: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    listCampaigns(page?: number, limit?: number): Promise<any>;
    getCampaign(id: string): Promise<{
        engagement: {
            received: number;
            opened: number;
            clicked: number;
        };
        _id: import("bson").ObjectId;
    }>;
    private campaignEngagementStats;
    sendCampaign(id: string): Promise<{
        ok: boolean;
        reason: string;
        targeted?: undefined;
        queued?: undefined;
    } | {
        ok: boolean;
        targeted: number;
        queued: number;
        reason?: undefined;
    }>;
    cancelCampaign(id: string): Promise<{
        ok: boolean;
    }>;
    broadcast(adminId: string, body: any): Promise<{
        ok: boolean;
        reason: string;
        targeted?: undefined;
        queued?: undefined;
    } | {
        ok: boolean;
        targeted: number;
        queued: number;
        reason?: undefined;
    }>;
    runScheduledCampaigns(): Promise<void>;
    appointmentReminders(): Promise<void>;
    retargetIncompleteOrders(): Promise<void>;
    overviewStats(): Promise<{
        window_days: number;
        notifications_created: any;
        delivered: any;
        failed: any;
        delivery_rate: number;
        opened: number;
        clicked: number;
        open_rate: number;
        ctr: number;
    }>;
}
export declare class AdminNotificationCenterController {
    private readonly svc;
    constructor(svc: AdminNotificationCenterService);
    segments(): Promise<{
        all: number;
        patients: number;
        providers: number;
        by_role: Record<string, number>;
    }>;
    statsOverview(): Promise<{
        window_days: number;
        notifications_created: any;
        delivered: any;
        failed: any;
        delivery_rate: number;
        opened: number;
        clicked: number;
        open_rate: number;
        ctr: number;
    }>;
    broadcast(admin: any, body: any): Promise<{
        ok: boolean;
        reason: string;
        targeted?: undefined;
        queued?: undefined;
    } | {
        ok: boolean;
        targeted: number;
        queued: number;
        reason?: undefined;
    }>;
    createCampaign(admin: any, body: any): Promise<{
        ok: boolean;
        campaign: {
            id: string;
            name: string;
            title: string;
            body: string;
            segment: string;
            deep_link: any;
            variants: any;
            scheduled_at: Date;
            status: string;
            stats: {};
            created_by: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    listCampaigns(page?: string, limit?: string): Promise<any>;
    getCampaign(id: string): Promise<{
        engagement: {
            received: number;
            opened: number;
            clicked: number;
        };
        _id: import("bson").ObjectId;
    }>;
    sendCampaign(id: string): Promise<{
        ok: boolean;
        reason: string;
        targeted?: undefined;
        queued?: undefined;
    } | {
        ok: boolean;
        targeted: number;
        queued: number;
        reason?: undefined;
    }>;
    cancelCampaign(id: string): Promise<{
        ok: boolean;
    }>;
    retarget(): Promise<void>;
}
export declare class AdminNotificationCenterModule {
}
