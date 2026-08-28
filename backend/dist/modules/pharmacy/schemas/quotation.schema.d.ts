import { Schema, Document } from 'mongoose';
import { ProcurementStatus } from '../enums/procurement-status.enum';
export interface Quotation extends Document {
    procurementRequestId: string;
    adminId: string;
    items: Array<{
        medicineId: string;
        quantity: number;
        price: number;
    }>;
    totalPrice: number;
    status: ProcurementStatus;
    adminNotes?: string;
    pharmacyFeedback?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const QuotationSchema: Schema<Quotation, import("mongoose").Model<Quotation, any, any, any, Document<unknown, any, Quotation, any, {}> & Quotation & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Quotation, Document<unknown, {}, import("mongoose").FlatRecord<Quotation>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Quotation> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
