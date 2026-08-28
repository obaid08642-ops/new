import { Document, Types } from 'mongoose';
export type DoctorProfileExtendedDocument = DoctorProfileExtended & Document;
export declare class DoctorProfileExtended {
    doctor_id: Types.ObjectId;
    parent_provider_account_id: Types.ObjectId | null;
    affiliated_hospital_id: Types.ObjectId | null;
    price_clinic: number;
    price_online: number;
    price_home: number;
    max_home_visit_radius_km: number;
    accepted_insurance_networks: string[];
    clinic_gallery_images: string[];
    weekly_schedule_template: Record<string, any>;
}
export declare const DoctorProfileExtendedSchema: import("mongoose").Schema<DoctorProfileExtended, import("mongoose").Model<DoctorProfileExtended, any, any, any, Document<unknown, any, DoctorProfileExtended, any, {}> & DoctorProfileExtended & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DoctorProfileExtended, Document<unknown, {}, import("mongoose").FlatRecord<DoctorProfileExtended>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<DoctorProfileExtended> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
