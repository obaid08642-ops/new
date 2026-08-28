export declare class RefundRequest {
    id: string;
    booking_kind: string;
    booking_id: string;
    patient_id: string;
    reason: string;
    amount?: number;
    status: string;
    resolved_by?: string;
    resolved_at?: Date;
    admin_note?: string;
}
export declare const RefundRequestSchema: import("mongoose").Schema<RefundRequest, import("mongoose").Model<RefundRequest, any, any, any, import("mongoose").Document<unknown, any, RefundRequest, any, {}> & RefundRequest & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RefundRequest, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<RefundRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<RefundRequest> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
