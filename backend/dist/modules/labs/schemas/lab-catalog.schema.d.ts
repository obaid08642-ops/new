import { Document, Types } from 'mongoose';
export type LabCatalogDocument = LabCatalog & Document;
export declare class LabCatalog {
    lab_id: string;
    test_code: string;
    test_name_ar: string;
    test_name_en: string;
    in_lab_price: number;
    home_collection_price: number;
    accepts_insurance: boolean;
    reference_ranges: any[];
}
export declare const LabCatalogSchema: import("mongoose").Schema<LabCatalog, import("mongoose").Model<LabCatalog, any, any, any, Document<unknown, any, LabCatalog, any, {}> & LabCatalog & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LabCatalog, Document<unknown, {}, import("mongoose").FlatRecord<LabCatalog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LabCatalog> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
