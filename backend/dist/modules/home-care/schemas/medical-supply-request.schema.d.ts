import { Document, Types } from 'mongoose';
export type MedicalSupplyRequestDocument = MedicalSupplyRequest & Document;
export declare class MedicalSupplyRequest {
    booking_id: Types.ObjectId;
    nurse_id: Types.ObjectId;
    requested_items: any[];
    priority: string;
}
export declare const MedicalSupplyRequestSchema: import("mongoose").Schema<MedicalSupplyRequest, import("mongoose").Model<MedicalSupplyRequest, any, any, any, Document<unknown, any, MedicalSupplyRequest, any, {}> & MedicalSupplyRequest & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MedicalSupplyRequest, Document<unknown, {}, import("mongoose").FlatRecord<MedicalSupplyRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MedicalSupplyRequest> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
