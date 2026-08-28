import { Document } from 'mongoose';
import { InsuranceDetails } from './insurance.schema';
export declare class RadiologyService extends Document {
    id: string;
    name_ar: string;
    name_en: string;
    short_code?: string;
    description_ar?: string;
    description_en?: string;
    modality: string;
    body_part?: string;
    price: number;
    old_price?: number;
    contrast_required: boolean;
    fasting_required: boolean;
    fasting_hours?: number;
    home_visit_supported: boolean;
    facility_visit_supported: boolean;
    turnaround_hours: number;
    preparation_ar: string[];
    preparation_en: string[];
    requires_referral: boolean;
    medical_referral_required: boolean;
    popularity: number;
    active: boolean;
    unavailable: boolean;
    is_deleted: boolean;
    public_eligibility: boolean;
    indexing_eligibility: boolean;
    medical_review_status: string;
    last_reviewed?: Date;
    provenance?: string;
    version: number;
    image_url?: string;
    icon?: string;
    estimated_duration_minutes: number;
    requires_pregnancy_check: boolean;
    requires_metal_implant_check: boolean;
    requires_contrast_allergy_check: boolean;
    cash_availability: boolean;
    insurance_availability: boolean;
    portable_ultrasound: boolean;
    modality_category: string;
    special_notes?: string;
}
export declare const RadiologyServiceSchema: import("mongoose").Schema<RadiologyService, import("mongoose").Model<RadiologyService, any, any, any, Document<unknown, any, RadiologyService, any, {}> & RadiologyService & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RadiologyService, Document<unknown, {}, import("mongoose").FlatRecord<RadiologyService>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<RadiologyService> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class RadiologyMachine extends Document {
    id: string;
    provider_id: string;
    name: string;
    type: string;
    is_active: boolean;
}
export declare const RadiologyMachineSchema: import("mongoose").Schema<RadiologyMachine, import("mongoose").Model<RadiologyMachine, any, any, any, Document<unknown, any, RadiologyMachine, any, {}> & RadiologyMachine & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RadiologyMachine, Document<unknown, {}, import("mongoose").FlatRecord<RadiologyMachine>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<RadiologyMachine> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare enum RadiologyBookingState {
    PENDING = "PENDING",
    NEW_REQUEST = "NEW_REQUEST",
    PENDING_INSURANCE = "PENDING_INSURANCE",
    WAITING_COPAY = "WAITING_COPAY",
    CONFIRMED = "CONFIRMED",
    ARRIVED_CHECKIN = "ARRIVED_CHECKIN",
    IN_SCANNING = "IN_SCANNING",
    REPORT_DRAFT = "REPORT_DRAFT",
    UNDER_REVIEW = "UNDER_REVIEW",
    REPORT_READY = "REPORT_READY",
    REPORT_PUBLISHED = "REPORT_PUBLISHED",
    SCAN_ABORTED = "SCAN_ABORTED",
    CANCELLED = "CANCELLED"
}
export declare const RADIOLOGY_BOOKING_TRANSITIONS: Record<string, any[]>;
export declare class RadiologyBooking extends Document {
    id: string;
    tracking_id: string;
    patient_id: string;
    patient_name?: string;
    patient_phone?: string;
    items: any[];
    total: number;
    service_fee: number;
    home_visit_fee: number;
    transportation_fee: number;
    total_price: number;
    location_type: string;
    facility_id?: string;
    address?: {
        lat?: number;
        lng?: number;
        address?: string;
        city?: string;
        district?: string;
    };
    scheduled_at: Date;
    instructions?: string;
    referral?: {
        name?: string;
        mime?: string;
        base64?: string;
    };
    state: RadiologyBookingState;
    state_history: any[];
    reports: any[];
    technician_id?: string;
    notes?: string;
    payment_method: string;
    insurance_provider?: string;
    insurance_member_id?: string;
    insurance_status: string;
    insurance_details?: InsuranceDetails;
    documents: Array<{
        kind: string;
        url_or_b64: string;
        filename?: string;
        uploaded_at: Date;
    }>;
    medical_referral_required: boolean;
    prescriptionFiles: string[];
    medicalReports: string[];
    referralFiles: string[];
    medicalJustification?: string;
    provider_account_id?: string;
    rejection_reason?: string;
    allocated_machine_id?: string;
    scanned_files_s3_urls: string[];
    signed_report_pdf_url?: string;
    report_storage_object_id?: string;
    clinical_impression_report?: string;
    delivery_mode: string;
    scan_type_code?: string;
    scan_name_ar?: string;
    scan_name_en?: string;
    abort_reason?: string;
    report_status?: string;
    report_approved_by?: string;
    report_approved_at?: Date;
    dicom_url?: string;
    scan_image_urls: string[];
    dicom_storage_object_id?: string;
    scan_storage_object_ids: string[];
    preparation_confirmed_at?: Date;
    preparation_confirmed: boolean;
    safety_questionnaire?: {
        is_pregnant?: boolean;
        has_metal_implant?: boolean;
        has_pacemaker?: boolean;
        has_contrast_allergy?: boolean;
        last_creatinine_date?: string;
        confirmed_at?: Date;
    };
    checkin_at?: Date;
    scan_started_at?: Date;
    scan_completed_at?: Date;
    reschedule_reason?: string;
    insurance_copay?: number;
    insurance_approval_code?: string;
    referring_doctor_id?: string;
    doctor_notified: boolean;
}
export declare const RadiologyBookingSchema: import("mongoose").Schema<RadiologyBooking, import("mongoose").Model<RadiologyBooking, any, any, any, Document<unknown, any, RadiologyBooking, any, {}> & RadiologyBooking & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RadiologyBooking, Document<unknown, {}, import("mongoose").FlatRecord<RadiologyBooking>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<RadiologyBooking> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
