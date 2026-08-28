import { Document } from 'mongoose';
export type SlaLogDocument = SlaLog & Document;
export declare class SlaLog {
    id: string;
    providerId: string;
    orderId: string;
    durationSeconds: number;
    slaLimit: number;
    isBreached: boolean;
}
export declare const SlaLogSchema: import("mongoose").Schema<SlaLog, import("mongoose").Model<SlaLog, any, any, any, Document<unknown, any, SlaLog, any, {}> & SlaLog & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SlaLog, Document<unknown, {}, import("mongoose").FlatRecord<SlaLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SlaLog> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
