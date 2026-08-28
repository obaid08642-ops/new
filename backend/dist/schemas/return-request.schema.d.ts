import { Document } from 'mongoose';
export declare class ReturnRequest {
    id: string;
    order_id: string;
    patient_id: string;
    pharmacy_id: string;
    reason: string;
    photo_url?: string;
    status: string;
    rejection_reason?: string;
}
export type ReturnRequestDocument = ReturnRequest & Document;
export declare const ReturnRequestSchema: import("mongoose").Schema<ReturnRequest, import("mongoose").Model<ReturnRequest, any, any, any, Document<unknown, any, ReturnRequest, any, {}> & ReturnRequest & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReturnRequest, Document<unknown, {}, import("mongoose").FlatRecord<ReturnRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ReturnRequest> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
