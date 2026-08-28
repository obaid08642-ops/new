import { Document } from 'mongoose';
export declare class PharmacyInventory {
    id: string;
    pharmacy_id: string;
    drug_id: string;
    price: number;
    stock_quantity: number;
    is_online: boolean;
    expiry_date?: Date;
}
export type PharmacyInventoryDocument = PharmacyInventory & Document;
export declare const PharmacyInventorySchema: import("mongoose").Schema<PharmacyInventory, import("mongoose").Model<PharmacyInventory, any, any, any, Document<unknown, any, PharmacyInventory, any, {}> & PharmacyInventory & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyInventory, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyInventory>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyInventory> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
