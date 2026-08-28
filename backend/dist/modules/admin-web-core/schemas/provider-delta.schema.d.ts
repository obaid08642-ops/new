import { Document, Types } from 'mongoose';
export type ProviderDeltaDocument = ProviderDelta & Document;
export declare class ProviderDelta {
    provider_id: Types.ObjectId;
    provider_type: string;
    old_profile_snapshot: Record<string, any>;
    proposed_new_metadata: Record<string, any>;
    status: string;
}
export declare const ProviderDeltaSchema: import("mongoose").Schema<ProviderDelta, import("mongoose").Model<ProviderDelta, any, any, any, Document<unknown, any, ProviderDelta, any, {}> & ProviderDelta & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderDelta, Document<unknown, {}, import("mongoose").FlatRecord<ProviderDelta>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderDelta> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
