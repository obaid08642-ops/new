import { Document, Types } from 'mongoose';
export type HospitalDepartmentDocument = HospitalDepartment & Document;
export declare class HospitalDepartment {
    hospital_id: Types.ObjectId;
    branch_id: Types.ObjectId;
    name_ar: string;
    name_en: string;
    specialty_code: string;
    consultation_fee: number;
    is_active: boolean;
}
export declare const HospitalDepartmentSchema: import("mongoose").Schema<HospitalDepartment, import("mongoose").Model<HospitalDepartment, any, any, any, Document<unknown, any, HospitalDepartment, any, {}> & HospitalDepartment & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HospitalDepartment, Document<unknown, {}, import("mongoose").FlatRecord<HospitalDepartment>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HospitalDepartment> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
