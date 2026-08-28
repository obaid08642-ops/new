import { Document } from 'mongoose';
export declare class DrugRejectionLog {
    id: string;
    medicine_id: string;
    order_id: string;
    pharmacy_id: string;
    type: 'reject' | 'accept';
    timestamp: Date;
}
export type DrugRejectionLogDocument = DrugRejectionLog & Document;
export declare const DrugRejectionLogSchema: import("mongoose").Schema<DrugRejectionLog, import("mongoose").Model<DrugRejectionLog, any, any, any, Document<unknown, any, DrugRejectionLog, any, {}> & DrugRejectionLog & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DrugRejectionLog, Document<unknown, {}, import("mongoose").FlatRecord<DrugRejectionLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<DrugRejectionLog> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
