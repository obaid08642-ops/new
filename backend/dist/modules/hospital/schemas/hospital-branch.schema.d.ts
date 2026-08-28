import { Document, Types } from 'mongoose';
export type HospitalBranchDocument = HospitalBranch & Document;
export declare class HospitalBranch {
    hospital_id: Types.ObjectId;
    name_ar: string;
    name_en: string;
    city: string;
    district: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    contact_number: string;
    is_active: boolean;
}
export declare const HospitalBranchSchema: import("mongoose").Schema<HospitalBranch, import("mongoose").Model<HospitalBranch, any, any, any, Document<unknown, any, HospitalBranch, any, {}> & HospitalBranch & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HospitalBranch, Document<unknown, {}, import("mongoose").FlatRecord<HospitalBranch>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HospitalBranch> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
