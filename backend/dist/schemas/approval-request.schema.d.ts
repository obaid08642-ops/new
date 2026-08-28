import { Document } from 'mongoose';
export declare enum ApprovalStatus {
    DRAFT = "draft",
    PENDING_REVIEW = "pending_review",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare class ApprovalRequest {
    id: string;
    entity_type: 'medicine' | 'provider' | 'facility' | 'service';
    entity_id?: string;
    status: ApprovalStatus;
    submitted_by: string;
    reviewed_by?: string;
    reviewed_at?: Date;
    rejected_reason?: string;
    change_data: Record<string, any>;
    version: number;
}
export type ApprovalRequestDocument = ApprovalRequest & Document;
export declare const ApprovalRequestSchema: import("mongoose").Schema<ApprovalRequest, import("mongoose").Model<ApprovalRequest, any, any, any, Document<unknown, any, ApprovalRequest, any, {}> & ApprovalRequest & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ApprovalRequest, Document<unknown, {}, import("mongoose").FlatRecord<ApprovalRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ApprovalRequest> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
