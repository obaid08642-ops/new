import { Document } from 'mongoose';
export declare class ReturnRequest extends Document {
    id: string;
    patient_id: string;
    order_id: string;
    service_type: string;
    reason: string;
    details?: string;
    refund_method: string;
    amount: number;
    attached_docs: string[];
    status: string;
    resolved_by?: string;
    resolved_at?: Date;
    admin_note?: string;
}
export declare const ReturnRequestSchema: import("mongoose").Schema<ReturnRequest, import("mongoose").Model<ReturnRequest, any, any, any, Document<unknown, any, ReturnRequest, any, {}> & ReturnRequest & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReturnRequest, Document<unknown, {}, import("mongoose").FlatRecord<ReturnRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ReturnRequest> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
