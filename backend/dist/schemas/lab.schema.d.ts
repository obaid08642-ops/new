import { Document } from 'mongoose';
import { InsuranceDetails } from './insurance.schema';
export declare class LabService extends Document {
    id: string;
    name_ar: string;
    name_en: string;
    short_code?: string;
    description_ar?: string;
    description_en?: string;
    category: string;
    sample_type: string;
    price: number;
    old_price?: number;
    fasting_required: boolean;
    fasting_hours?: number;
    home_visit_supported: boolean;
    facility_visit_supported: boolean;
    turnaround_hours: number;
    preparation_ar: string[];
    preparation_en: string[];
    is_package: boolean;
    included_services: string[];
    popularity: number;
    active: boolean;
    unavailable: boolean;
    medical_referral_required: boolean;
    is_deleted: boolean;
    public_eligibility: boolean;
    indexing_eligibility: boolean;
    medical_review_status: string;
    last_reviewed?: Date;
    provenance?: string;
    version: number;
    cash_availability: boolean;
    insurance_availability: boolean;
    home_collection_availability: boolean;
    in_lab_availability: boolean;
    special_notes?: string;
    reference_ranges?: {
        min: number;
        max: number;
        unit: string;
    };
    image_url?: string;
    icon?: string;
}
export declare const LabServiceSchema: import("mongoose").Schema<LabService, import("mongoose").Model<LabService, any, any, any, Document<unknown, any, LabService, any, {}> & LabService & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LabService, Document<unknown, {}, import("mongoose").FlatRecord<LabService>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LabService> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare enum LabBookingState {
    NEW_REQUEST = "NEW_REQUEST",
    PENDING_INSURANCE = "PENDING_INSURANCE",
    WAITING_COPAY = "WAITING_COPAY",
    CONFIRMED = "CONFIRMED",
    IN_TRANSIT = "IN_TRANSIT",
    IN_LAB = "IN_LAB",
    SAMPLE_COLLECTED = "SAMPLE_COLLECTED",
    PROCESSING = "PROCESSING",
    RESULT_UPLOADED = "RESULT_UPLOADED",
    REPORTED = "REPORTED",
    SAMPLE_REJECTED = "SAMPLE_REJECTED",
    CANCELLED = "CANCELLED"
}
export declare const LAB_BOOKING_TRANSITIONS: Record<string, any[]>;
export declare class LabBooking extends Document {
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
    state: LabBookingState;
    state_history: any[];
    reports: any[];
    technician_id?: string;
    notes?: string;
    payment_method: string;
    insurance_provider?: string;
    insurance_member_id?: string;
    insurance_status: string;
    insurance_copay: number;
    insurance_details?: InsuranceDetails;
    documents: Array<{
        kind: 'prescription' | 'doctor_request' | 'preauth' | 'previous_report';
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
    reschedule_reason?: string;
    emergency_reason?: string;
    reject_reason?: string;
    gps_location?: {
        lat?: number;
        lng?: number;
        eta?: number;
        distance?: number;
    };
}
export declare const LabBookingSchema: import("mongoose").Schema<LabBooking, import("mongoose").Model<LabBooking, any, any, any, Document<unknown, any, LabBooking, any, {}> & LabBooking & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LabBooking, Document<unknown, {}, import("mongoose").FlatRecord<LabBooking>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LabBooking> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class LabSample extends Document {
    id: string;
    lab_order_id: string;
    patient_id: string;
    barcode: string;
    tests: string[];
    stage: 'received' | 'analyzing' | 'result_ready' | 'sent';
    assigned_to?: string;
    notes?: string;
}
export declare const LabSampleSchema: import("mongoose").Schema<LabSample, import("mongoose").Model<LabSample, any, any, any, Document<unknown, any, LabSample, any, {}> & LabSample & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LabSample, Document<unknown, {}, import("mongoose").FlatRecord<LabSample>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LabSample> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
