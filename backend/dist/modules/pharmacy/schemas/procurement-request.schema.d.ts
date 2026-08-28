import { Document, Types } from 'mongoose';
export type ProcurementRequestDocument = ProcurementRequest & Document;
export declare class ProcurementRequest {
    pharmacy_id: string;
    created_by: string;
    items: any[];
    status: string;
    uploaded_file_url: string;
    total_warehouse_quotation_price: number;
}
export declare const ProcurementRequestSchema: import("mongoose").Schema<ProcurementRequest, import("mongoose").Model<ProcurementRequest, any, any, any, Document<unknown, any, ProcurementRequest, any, {}> & ProcurementRequest & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProcurementRequest, Document<unknown, {}, import("mongoose").FlatRecord<ProcurementRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProcurementRequest> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
