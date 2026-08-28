import { Document } from 'mongoose';
export declare class LeaveRequest {
    id: string;
    facility_id: string;
    provider_account_id: string;
    provider_name?: string;
    provider_type?: string;
    type: string;
    start_date: Date;
    end_date: Date;
    reason?: string;
    status: string;
    decided_by?: string;
    decided_at?: Date;
    decision_note?: string;
}
export type LeaveRequestDocument = LeaveRequest & Document;
export declare const LeaveRequestSchema: import("mongoose").Schema<LeaveRequest, import("mongoose").Model<LeaveRequest, any, any, any, Document<unknown, any, LeaveRequest, any, {}> & LeaveRequest & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LeaveRequest, Document<unknown, {}, import("mongoose").FlatRecord<LeaveRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LeaveRequest> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
