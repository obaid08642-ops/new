import { Document } from 'mongoose';
export declare enum DeltaStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare class ProviderDelta extends Document {
    id: string;
    provider_account_id: string;
    changes: Record<string, any>;
    status: DeltaStatus;
    rejection_reason?: string;
    reviewed_by?: string;
    reviewed_at?: Date;
}
export declare const ProviderDeltaSchema: import("mongoose").Schema<ProviderDelta, import("mongoose").Model<ProviderDelta, any, any, any, Document<unknown, any, ProviderDelta, any, {}> & ProviderDelta & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderDelta, Document<unknown, {}, import("mongoose").FlatRecord<ProviderDelta>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderDelta> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
