import { Document, Types } from 'mongoose';
export type RadiologyBookingDocument = RadiologyBooking & Document;
export declare class RadiologyBooking {
    id: string;
    parent_appointment_id: Types.ObjectId;
    patient_id: Types.ObjectId;
    radiology_center_id: Types.ObjectId;
    delivery_mode: string;
    referring_doctor_id?: string;
    scan_type_code: string;
    scan_name_ar: string;
    scan_name_en: string;
    allocated_machine_id: string;
    status: string;
    clinical_impression_report: string;
    scanned_files_s3_urls: string[];
    signed_report_pdf_url: string;
    report_storage_object_id: string;
    scan_storage_object_ids: string[];
}
export declare const RadiologyBookingSchema: import("mongoose").Schema<RadiologyBooking, import("mongoose").Model<RadiologyBooking, any, any, any, Document<unknown, any, RadiologyBooking, any, {}> & RadiologyBooking & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RadiologyBooking, Document<unknown, {}, import("mongoose").FlatRecord<RadiologyBooking>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<RadiologyBooking> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
