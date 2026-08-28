import { Document } from 'mongoose';
export declare class CallMetric {
    id: string;
    session_id: string;
    participant_id: string;
    bitrate_kbps?: number;
    packet_loss_pct?: number;
    jitter_ms?: number;
    rtt_ms?: number;
    quality_score?: number;
    raw?: any;
}
export type CallMetricDocument = CallMetric & Omit<Document, 'id'>;
export declare const CallMetricSchema: import("mongoose").Schema<CallMetric, import("mongoose").Model<CallMetric, any, any, any, Document<unknown, any, CallMetric, any, {}> & CallMetric & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CallMetric, Document<unknown, {}, import("mongoose").FlatRecord<CallMetric>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CallMetric> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
