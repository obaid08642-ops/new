import { Document } from 'mongoose';
export declare enum MedicalReportType {
    CLINIC_NOTE = "clinic_note",
    DISCHARGE_SUMMARY = "discharge_summary",
    SURGERY_REPORT = "surgery_report",
    CONSULTATION_NOTE = "consultation_note",
    SECOND_OPINION = "second_opinion",
    MEDICAL_CERTIFICATE = "medical_certificate",
    REFERRAL = "referral",
    OTHER = "other"
}
export declare class MedicalReport extends Document {
    id: string;
    tracking_id: string;
    patient_id: string;
    patient_name?: string;
    title_ar: string;
    title_en?: string;
    report_type: MedicalReportType;
    summary?: string;
    body?: string;
    diagnosis?: string;
    recommendations?: string;
    critical: boolean;
    appointment_id?: string;
    prescription_id?: string;
    lab_booking_id?: string;
    radiology_booking_id?: string;
    doctor_id?: string;
    doctor_name?: string;
    facility_id?: string;
    facility_name?: string;
    attachments: any[];
    issued_at?: Date;
    viewed_by_patient: boolean;
    patient_viewed_at?: Date;
}
export declare const MedicalReportSchema: import("mongoose").Schema<MedicalReport, import("mongoose").Model<MedicalReport, any, any, any, Document<unknown, any, MedicalReport, any, {}> & MedicalReport & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MedicalReport, Document<unknown, {}, import("mongoose").FlatRecord<MedicalReport>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MedicalReport> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
