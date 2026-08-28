import { Document, Schema as MongooseSchema } from 'mongoose';
export type UniversalActivityDocument = UniversalActivity & Document;
export declare class UniversalActivity {
    id: string;
    eventType: string;
    userId?: string;
    providerId?: string;
    metadata: Record<string, any>;
    timestamp: Date;
}
export declare const UniversalActivitySchema: MongooseSchema<UniversalActivity, import("mongoose").Model<UniversalActivity, any, any, any, Document<unknown, any, UniversalActivity, any, {}> & UniversalActivity & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UniversalActivity, Document<unknown, {}, import("mongoose").FlatRecord<UniversalActivity>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<UniversalActivity> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
