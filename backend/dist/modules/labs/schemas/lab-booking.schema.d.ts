import { Document, Types } from 'mongoose';
export type LabBookingDocument = LabBooking & Document;
export declare class LabBooking {
    parent_appointment_id: Types.ObjectId;
    patient_id: Types.ObjectId;
    patient_name: string;
    patient_age: number;
    lab_id: Types.ObjectId;
    delivery_mode: string;
    address?: {
        lat?: number;
        lng?: number;
        address?: string;
        city?: string;
        district?: string;
    };
    test_code: string;
    test_name_ar: string;
    test_name_en: string;
    sample_barcode_token: string;
    status: string;
    entered_metric_results: any[];
    signed_report_pdf_url: string;
    payment_method: string;
    total_price: number;
}
export declare const LabBookingSchema: import("mongoose").Schema<LabBooking, import("mongoose").Model<LabBooking, any, any, any, Document<unknown, any, LabBooking, any, {}> & LabBooking & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LabBooking, Document<unknown, {}, import("mongoose").FlatRecord<LabBooking>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LabBooking> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
