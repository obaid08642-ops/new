import { Document, Types } from 'mongoose';
export declare enum DeltaStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare class ProviderDelta extends Document {
    providerId: Types.ObjectId;
    oldData: Record<string, any>;
    newData: Record<string, any>;
    status: DeltaStatus;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    rejectionReason?: string;
}
export declare const ProviderDeltaSchema: import("mongoose").Schema<ProviderDelta, import("mongoose").Model<ProviderDelta, any, any, any, Document<unknown, any, ProviderDelta, any, {}> & ProviderDelta & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderDelta, Document<unknown, {}, import("mongoose").FlatRecord<ProviderDelta>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderDelta> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
