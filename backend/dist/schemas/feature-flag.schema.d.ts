import { Document } from 'mongoose';
export type FeatureFlagDocument = FeatureFlag & Document;
export declare class FeatureFlag {
    id: string;
    flagName: string;
    isEnabled: boolean;
    updatedBy?: string;
}
export declare const FeatureFlagSchema: import("mongoose").Schema<FeatureFlag, import("mongoose").Model<FeatureFlag, any, any, any, Document<unknown, any, FeatureFlag, any, {}> & FeatureFlag & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, FeatureFlag, Document<unknown, {}, import("mongoose").FlatRecord<FeatureFlag>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<FeatureFlag> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
