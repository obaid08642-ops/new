import { Document, Types } from 'mongoose';
export type HospitalStaffDocument = HospitalStaff & Document;
export declare class HospitalStaff {
    user_id: Types.ObjectId;
    hospital_id: Types.ObjectId;
    branch_id: Types.ObjectId;
    department_id: Types.ObjectId;
    role: string;
    is_active: boolean;
}
export declare const HospitalStaffSchema: import("mongoose").Schema<HospitalStaff, import("mongoose").Model<HospitalStaff, any, any, any, Document<unknown, any, HospitalStaff, any, {}> & HospitalStaff & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HospitalStaff, Document<unknown, {}, import("mongoose").FlatRecord<HospitalStaff>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HospitalStaff> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
