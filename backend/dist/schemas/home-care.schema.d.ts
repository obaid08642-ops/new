import { Document } from 'mongoose';
import { InsuranceDetails } from './insurance.schema';
export declare enum NursingBookingState {
    NEW_REQUEST = "NEW_REQUEST",
    PENDING_INSURANCE = "PENDING_INSURANCE",
    WAITING_COPAY = "WAITING_COPAY",
    CONFIRMED = "CONFIRMED",
    IN_TRANSIT = "IN_TRANSIT",
    ARRIVED = "ARRIVED",
    CARE_IN_PROGRESS = "CARE_IN_PROGRESS",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    PROVIDER_ASSIGNED = "PROVIDER_ASSIGNED",
    NO_SHOW = "NO_SHOW",
    ESCALATED_EMERGENCY = "ESCALATED_EMERGENCY",
    CANCELLED = "CANCELLED"
}
export declare const HomeCareBookingState: typeof NursingBookingState;
export declare class HomeCareService extends Document {
    id: string;
    name_ar: string;
    name_en: string;
    description_ar?: string;
    description_en?: string;
    category: string;
    icon: string;
    price: number;
    duration: string;
    duration_value: number;
    requires_patient_medication: boolean;
    requires_companion: boolean;
    cash_availability: boolean;
    insurance_availability: boolean;
    image_url?: string;
    active: boolean;
    is_deleted: boolean;
    public_eligibility: boolean;
    indexing_eligibility: boolean;
    medical_review_status: string;
    last_reviewed?: Date;
    provenance?: string;
    popularity: number;
}
export declare const HomeCareServiceSchema: import("mongoose").Schema<HomeCareService, import("mongoose").Model<HomeCareService, any, any, any, Document<unknown, any, HomeCareService, any, {}> & HomeCareService & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HomeCareService, Document<unknown, {}, import("mongoose").FlatRecord<HomeCareService>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HomeCareService> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class HomeCareBooking extends Document {
    id: string;
    tracking_id: string;
    patient_id: string;
    patient_name?: string;
    patient_phone?: string;
    service_id?: string;
    service_name_ar: string;
    service_name_en?: string;
    notes?: string;
    sessions_count: number;
    duration: string;
    total: number;
    service_fee: number;
    home_visit_fee: number;
    transportation_fee: number;
    total_price: number;
    address?: {
        lat?: number;
        lng?: number;
        address?: string;
        city?: string;
        district?: string;
    };
    scheduled_at: Date;
    state: NursingBookingState;
    state_history: any[];
    provider_id?: string;
    provider_name?: string;
    provider_phone?: string;
    payment_method?: string;
    insurance_status: string;
    insurance_details?: InsuranceDetails;
    checklist: {
        meds_available?: boolean;
        medical_supplies_available?: boolean;
        patient_reachable?: boolean;
        exact_location_confirmed?: boolean;
        gate_code?: string;
        parking_instructions?: string;
    };
    gps_tracking: {
        current_lat?: number;
        current_lng?: number;
        last_updated?: Date;
    };
    timers: {
        transit_started_at?: Date;
        arrived_at?: Date;
        care_started_at?: Date;
        completed_at?: Date;
        no_show_timer_started_at?: Date;
    };
    vitals: {
        bp?: string;
        hr?: number;
        rr?: number;
        temp?: number;
        spo2?: number;
        blood_sugar?: number;
        weight?: number;
        height?: number;
        pain_scale?: number;
    };
    clinical_notes?: string;
    procedure_notes?: string;
    medication_administered?: string;
    consumables_used?: string;
    recommendations?: string;
    follow_up_instructions?: string;
    before_procedure_image?: string;
    after_procedure_image?: string;
    patient_signature_base64?: string;
    emergency_escalation: {
        reason?: string;
        refunded_amount?: number;
        at?: Date;
    };
    audit_trail: {
        action: string;
        timestamp: Date;
        userId?: string;
        device?: string;
    }[];
    referring_doctor_id?: string;
    rating: {
        score?: number;
        comment?: string;
    };
}
export declare const HomeCareBookingSchema: import("mongoose").Schema<HomeCareBooking, import("mongoose").Model<HomeCareBooking, any, any, any, Document<unknown, any, HomeCareBooking, any, {}> & HomeCareBooking & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HomeCareBooking, Document<unknown, {}, import("mongoose").FlatRecord<HomeCareBooking>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HomeCareBooking> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class NurseProvider extends Document {
    id: string;
    name_ar: string;
    name_en: string;
    facility_name: string;
    distance_km: number;
    price: number;
    available_now: boolean;
}
export declare const NurseProviderSchema: import("mongoose").Schema<NurseProvider, import("mongoose").Model<NurseProvider, any, any, any, Document<unknown, any, NurseProvider, any, {}> & NurseProvider & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, NurseProvider, Document<unknown, {}, import("mongoose").FlatRecord<NurseProvider>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<NurseProvider> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class NursingVisitReport extends Document {
    id: string;
    booking_id: string;
    patient_id: string;
    nurse_id: string;
    check_in_time?: Date;
    check_out_time?: Date;
    gps_lat?: number;
    gps_lng?: number;
    completed_tasks?: string[];
    vitals_logged?: any;
    vital_signs?: any;
    notes?: string;
    procedures_performed?: string[];
}
export declare const NursingVisitReportSchema: import("mongoose").Schema<NursingVisitReport, import("mongoose").Model<NursingVisitReport, any, any, any, Document<unknown, any, NursingVisitReport, any, {}> & NursingVisitReport & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, NursingVisitReport, Document<unknown, {}, import("mongoose").FlatRecord<NursingVisitReport>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<NursingVisitReport> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class CarePlan extends Document {
    id: string;
    patient_id: string;
    doctor_id?: string;
    nurse_id?: string;
    title: string;
    description?: string;
    tasks: string[];
    status: string;
}
export declare const CarePlanSchema: import("mongoose").Schema<CarePlan, import("mongoose").Model<CarePlan, any, any, any, Document<unknown, any, CarePlan, any, {}> & CarePlan & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CarePlan, Document<unknown, {}, import("mongoose").FlatRecord<CarePlan>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CarePlan> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class HomeCarePackage extends Document {
    name_ar: string;
    name_en?: string;
    description_ar?: string;
    description_en?: string;
    price: number;
    visits_count: number;
    duration_days: number;
    service_ids: string[];
    active: boolean;
}
export declare const HomeCarePackageSchema: import("mongoose").Schema<HomeCarePackage, import("mongoose").Model<HomeCarePackage, any, any, any, Document<unknown, any, HomeCarePackage, any, {}> & HomeCarePackage & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HomeCarePackage, Document<unknown, {}, import("mongoose").FlatRecord<HomeCarePackage>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HomeCarePackage> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class MedicalSupplyRequest extends Document {
    id: string;
    visit_report_id: string;
    nurse_id: string;
    items: any[];
    status: string;
}
export declare const MedicalSupplyRequestSchema: import("mongoose").Schema<MedicalSupplyRequest, import("mongoose").Model<MedicalSupplyRequest, any, any, any, Document<unknown, any, MedicalSupplyRequest, any, {}> & MedicalSupplyRequest & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MedicalSupplyRequest, Document<unknown, {}, import("mongoose").FlatRecord<MedicalSupplyRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MedicalSupplyRequest> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
