import { OnModuleInit } from '@nestjs/common';
import { Model, Document } from 'mongoose';
export declare class PushToken {
    token: string;
    user_id: string;
    provider: string;
    platform: string;
    device_id?: string;
    device_name?: string;
    active: boolean;
    last_seen_at?: Date;
    failure_count: number;
    last_failure_reason?: string;
}
export type PushTokenDocument = PushToken & Document;
export declare const PushTokenSchema: import("mongoose").Schema<PushToken, Model<PushToken, any, any, any, Document<unknown, any, PushToken, any, {}> & PushToken & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PushToken, Document<unknown, {}, import("mongoose").FlatRecord<PushToken>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PushToken> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class PushLog {
    user_id: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    status: string;
    sent_count: number;
    failed_count: number;
    errors?: string[];
    meta?: Record<string, any>;
}
export type PushLogDocument = PushLog & Document;
export declare const PushLogSchema: import("mongoose").Schema<PushLog, Model<PushLog, any, any, any, Document<unknown, any, PushLog, any, {}> & PushLog & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PushLog, Document<unknown, {}, import("mongoose").FlatRecord<PushLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PushLog> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class WebPushSubscription {
    endpoint: string;
    user_id: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    user_agent?: string;
    active: boolean;
}
export type WebPushSubscriptionDocument = WebPushSubscription & Document;
export declare const WebPushSubscriptionSchema: import("mongoose").Schema<WebPushSubscription, Model<WebPushSubscription, any, any, any, Document<unknown, any, WebPushSubscription, any, {}> & WebPushSubscription & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WebPushSubscription, Document<unknown, {}, import("mongoose").FlatRecord<WebPushSubscription>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<WebPushSubscription> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class PushEngagement {
    user_id: string;
    event: string;
    notification_id?: string;
    campaign_id?: string;
    data?: Record<string, any>;
}
export type PushEngagementDocument = PushEngagement & Document;
export declare const PushEngagementSchema: import("mongoose").Schema<PushEngagement, Model<PushEngagement, any, any, any, Document<unknown, any, PushEngagement, any, {}> & PushEngagement & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PushEngagement, Document<unknown, {}, import("mongoose").FlatRecord<PushEngagement>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PushEngagement> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class PushService implements OnModuleInit {
    private readonly tokens;
    private readonly logs;
    private readonly webSubs;
    private readonly engagement;
    private readonly logger;
    private queue;
    private worker;
    private readonly EXPO_URL;
    private readonly FCM_URL;
    private fcmTokenCache;
    private fcmProjects;
    getFcmAccessToken(projectIdx?: number): Promise<string | null>;
    constructor(tokens: Model<PushTokenDocument>, logs: Model<PushLogDocument>, webSubs: Model<WebPushSubscriptionDocument>, engagement: Model<PushEngagementDocument>);
    private cachedApnsJwt;
    private cachedApnsJwtIat;
    private apnsConfigured;
    private getApnsJwt;
    private sendApns;
    private webPushLib;
    private webPushReady;
    private initWebPush;
    private deliverWebPush;
    trackEngagement(userId: string, body: {
        event: string;
        notification_id?: string;
        campaign_id?: string;
        data?: any;
    }): Promise<{
        ok: boolean;
    }>;
    broadcastToUsers(userIds: string[], title: string, body: string, data?: any): Promise<{
        queued: number;
    }>;
    onModuleInit(): void;
    register(user: any, body: {
        token: string;
        provider?: string;
        platform?: string;
        device_id?: string;
        device_name?: string;
    }): Promise<{
        ok: boolean;
        reason: string;
    } | {
        ok: boolean;
        reason?: undefined;
    }>;
    unregister(userId: string, token: string): Promise<{
        ok: boolean;
    }>;
    getUserDevices(userId: string): Promise<(import("mongoose").FlattenMaps<PushTokenDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    cleanupStaleTokens(): Promise<void>;
    queueNotification(userId: string, title: string, body: string, data?: any, priority?: 'high' | 'normal'): Promise<void>;
    sendToUser(userId: string, title: string, body: string, data?: any): Promise<{
        sent: number;
        failed: number;
        errors: string[];
    } | {
        sent: number;
        failed: number;
    }>;
    private deliverPush;
    private chunkArray;
    onBooking(evt: any): Promise<void>;
    onChatMessage(evt: any): Promise<void>;
    onCallIncoming(evt: any): Promise<void>;
    onCallMissed(evt: any): Promise<void>;
    onPaymentCompleted(evt: any): Promise<void>;
    onPaymentFailed(evt: any): Promise<void>;
    onReportReady(evt: any): Promise<void>;
}
export declare class PushController {
    private readonly svc;
    constructor(svc: PushService);
    register(u: any, b: any): Promise<{
        ok: boolean;
        reason: string;
    } | {
        ok: boolean;
        reason?: undefined;
    }>;
    unregister(u: any, b: {
        token: string;
    }): Promise<{
        ok: boolean;
    }>;
    devices(u: any): Promise<(import("mongoose").FlattenMaps<PushTokenDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    test(u: any): Promise<{
        sent: number;
        failed: number;
        errors: string[];
    } | {
        sent: number;
        failed: number;
    }>;
    webSubscribe(u: any, b: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
        user_agent?: string;
    }): Promise<{
        ok: boolean;
        reason: string;
    } | {
        ok: boolean;
        reason?: undefined;
    }>;
    webUnsubscribe(u: any, b: {
        endpoint: string;
    }): Promise<{
        ok: boolean;
    }>;
    vapidKey(): {
        ok: boolean;
        public_key: string;
    };
    track(u: any, b: any): Promise<{
        ok: boolean;
    }>;
    sendCampaign(b: {
        title: string;
        body: string;
        target: string;
    }): Promise<{
        ok: boolean;
        message: string;
    }>;
}
export declare class PushModule {
}
