import { Document } from 'mongoose';
export type AdPlacementDocument = AdPlacement & Document;
export declare class AdPlacement {
    id: string;
    providerId: string;
    bidAmount: number;
    dailyBudget: number;
    targetedKeywords: string[];
    status: 'active' | 'paused';
    impressionsCount: number;
    clicksCount: number;
}
export declare const AdPlacementSchema: import("mongoose").Schema<AdPlacement, import("mongoose").Model<AdPlacement, any, any, any, Document<unknown, any, AdPlacement, any, {}> & AdPlacement & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AdPlacement, Document<unknown, {}, import("mongoose").FlatRecord<AdPlacement>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AdPlacement> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
