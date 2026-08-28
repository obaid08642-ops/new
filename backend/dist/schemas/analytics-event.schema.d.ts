import { Document } from 'mongoose';
export declare class AnalyticsEvent {
    id: string;
    user_id?: string;
    event_type: string;
    domain: string;
    metadata: Record<string, any>;
    session_id?: string;
    ip_address?: string;
    user_agent?: string;
}
export type AnalyticsEventDocument = AnalyticsEvent & Document;
export declare const AnalyticsEventSchema: import("mongoose").Schema<AnalyticsEvent, import("mongoose").Model<AnalyticsEvent, any, any, any, Document<unknown, any, AnalyticsEvent, any, {}> & AnalyticsEvent & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AnalyticsEvent, Document<unknown, {}, import("mongoose").FlatRecord<AnalyticsEvent>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AnalyticsEvent> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
