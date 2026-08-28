import { Document } from 'mongoose';
export declare class B2BRequest {
    id: string;
    pharmacy: string;
    total_items: number;
    input_method: 'voice' | 'ocr' | 'manual';
    status: 'pending' | 'approved' | 'rejected';
    notes: string;
    items: Array<{
        name: string;
        qty: number;
        unit: string;
    }>;
    submitted: Date;
}
export type B2BRequestDocument = B2BRequest & Document;
export declare const B2BRequestSchema: import("mongoose").Schema<B2BRequest, import("mongoose").Model<B2BRequest, any, any, any, Document<unknown, any, B2BRequest, any, {}> & B2BRequest & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, B2BRequest, Document<unknown, {}, import("mongoose").FlatRecord<B2BRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<B2BRequest> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
