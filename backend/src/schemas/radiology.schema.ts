import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { trackingId, TRACK_PREFIX } from '../common/tracking';
import { InsuranceDetails, InsuranceDetailsSchema } from './insurance.schema';

/**
 * RadiologyService — independent catalog from LabService (X-Ray / CT / MRI / Ultrasound / Mammography / DEXA).
 */
@Schema({ timestamps: true })
export class RadiologyService extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true }) name_ar: string;
  @Prop({ required: true }) name_en: string;
  @Prop() short_code?: string;
  @Prop() description_ar?: string;
  @Prop() description_en?: string;
  // imaging modality
  @Prop({ required: true, index: true }) modality: string; // xray | ct | mri | ultrasound | mammography | dexa | fluoroscopy | pet
  @Prop() body_part?: string; // chest, abdomen, brain, knee, etc.
  @Prop({ required: true }) price: number;
  @Prop({ default: 0 }) old_price?: number;
  @Prop({ default: false }) contrast_required: boolean;
  @Prop({ default: false }) fasting_required: boolean;
  @Prop({ default: 6 }) fasting_hours?: number;
  @Prop({ default: false }) home_visit_supported: boolean; // only for portable ultrasound
  @Prop({ default: true }) facility_visit_supported: boolean;
  @Prop({ default: 24 }) turnaround_hours: number;
  @Prop({ default: [] }) preparation_ar: string[];
  @Prop({ default: [] }) preparation_en: string[];
  @Prop({ default: false }) requires_referral: boolean;
  @Prop({ default: false }) medical_referral_required: boolean;
  @Prop({ default: 0 }) popularity: number;
  @Prop({ default: true }) active: boolean;
  @Prop({ default: false }) unavailable: boolean;
  @Prop({ default: false, index: true }) is_deleted: boolean;
  @Prop({ default: 1 }) version: number;
  @Prop() image_url?: string; // Cloudinary catalog image
  @Prop() icon?: string;

  // PILLAR 2: Duration Lock — affects calendar slot calculation
  @Prop({ default: 30 }) estimated_duration_minutes: number;

  // PILLAR 3: Safety & Consent Risk Flags
  @Prop({ default: false }) requires_pregnancy_check: boolean;       // For X-Ray, CT
  @Prop({ default: false }) requires_metal_implant_check: boolean;   // For MRI
  @Prop({ default: false }) requires_contrast_allergy_check: boolean; // For contrast scans

  // PILLAR 2: Delivery Mode + Availability
  @Prop({ default: true }) cash_availability: boolean;
  @Prop({ default: true }) insurance_availability: boolean;
  @Prop({ default: false }) portable_ultrasound: boolean; // home visit for sonography only
  @Prop({ enum: ['MRI', 'CT', 'X-Ray', 'Ultrasound', 'Mammography', 'DEXA', 'Fluoroscopy', 'PET'] }) modality_category: string;

  // MODULE 15: Catalog management — changes require admin delta approval
  @Prop() special_notes?: string;
}
export const RadiologyServiceSchema = SchemaFactory.createForClass(RadiologyService);
RadiologyServiceSchema.index({ name_ar: 'text', name_en: 'text' });
RadiologyServiceSchema.index({ modality: 1, popularity: -1 });

@Schema({ timestamps: true })
export class RadiologyMachine extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true }) provider_id: string; // The radiology center ID
  @Prop({ required: true }) name: string; // e.g., 'جهاز رنين 1'
  @Prop({ required: true }) type: string; // 'MRI', 'CT', 'X-RAY'
  @Prop({ default: true }) is_active: boolean;
}
export const RadiologyMachineSchema = SchemaFactory.createForClass(RadiologyMachine);
RadiologyMachineSchema.index({ provider_id: 1, is_active: 1 });

// PILLAR 1: THE RADIOLOGY STATE MACHINE (STRICT LIFECYCLE — Blueprint V1.0)
export enum RadiologyBookingState {
  PENDING           = 'PENDING',
  NEW_REQUEST       = 'NEW_REQUEST',        // Patient → Center: "طلب جديد"
  PENDING_INSURANCE = 'PENDING_INSURANCE',   // Center → Center: "إدخال الموافقة"
  WAITING_COPAY     = 'WAITING_COPAY',       // Center → Patient: "بانتظار دفع المريض"
  CONFIRMED         = 'CONFIRMED',           // Backend → Center: "مجدول"
  ARRIVED_CHECKIN   = 'ARRIVED_CHECKIN',     // Center → Center: "المريض بالانتظار"
  IN_SCANNING       = 'IN_SCANNING',         // Center → Center: "داخل غرفة الأشعة"
  REPORT_DRAFT      = 'REPORT_DRAFT',        // MODULE 10: Technician uploaded
  UNDER_REVIEW      = 'UNDER_REVIEW',        // MODULE 10: Radiologist reviewing
  REPORT_READY      = 'REPORT_READY',        // Center → -: "نتيجتك جاهزة"
  REPORT_PUBLISHED  = 'REPORT_PUBLISHED',
  SCAN_ABORTED      = 'SCAN_ABORTED',        // Center → Center: "فحص ملغى" — triggers refund
  CANCELLED         = 'CANCELLED',
}

export const RADIOLOGY_BOOKING_TRANSITIONS: Record<string, any[]> = {
  [RadiologyBookingState.NEW_REQUEST]:       [RadiologyBookingState.PENDING_INSURANCE, RadiologyBookingState.CONFIRMED, RadiologyBookingState.CANCELLED],
  [RadiologyBookingState.PENDING_INSURANCE]: [RadiologyBookingState.WAITING_COPAY, RadiologyBookingState.CANCELLED],
  [RadiologyBookingState.WAITING_COPAY]:     [RadiologyBookingState.CONFIRMED, RadiologyBookingState.CANCELLED],
  [RadiologyBookingState.CONFIRMED]:         [RadiologyBookingState.ARRIVED_CHECKIN, RadiologyBookingState.CANCELLED],
  [RadiologyBookingState.ARRIVED_CHECKIN]:   [RadiologyBookingState.IN_SCANNING, RadiologyBookingState.SCAN_ABORTED],
  [RadiologyBookingState.IN_SCANNING]:       [RadiologyBookingState.REPORT_DRAFT, RadiologyBookingState.SCAN_ABORTED],
  [RadiologyBookingState.REPORT_DRAFT]:      [RadiologyBookingState.UNDER_REVIEW],
  [RadiologyBookingState.UNDER_REVIEW]:      [RadiologyBookingState.REPORT_READY, RadiologyBookingState.REPORT_DRAFT],
  [RadiologyBookingState.REPORT_READY]:      [],
  [RadiologyBookingState.SCAN_ABORTED]:      [RadiologyBookingState.CONFIRMED, RadiologyBookingState.CANCELLED],
  [RadiologyBookingState.CANCELLED]:         [],
};

@Schema({ timestamps: true })
export class RadiologyBooking extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ unique: true, default: () => trackingId(TRACK_PREFIX.radiology_booking) }) tracking_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() patient_name?: string;
  @Prop() patient_phone?: string;
  @Prop({ default: [] }) items: any[]; // [{service_id, name_ar, name_en, modality, body_part, price}]
  @Prop({ required: true }) total: number;

  @Prop({ default: 0 }) service_fee: number;
  @Prop({ default: 0 }) home_visit_fee: number;
  @Prop({ default: 0 }) transportation_fee: number;
  @Prop({ default: 0 }) total_price: number;

  @Prop({ enum: ['home', 'facility'], default: 'facility' }) location_type: string;
  @Prop() facility_id?: string;
  @Prop({ type: Object }) address?: { lat?: number; lng?: number; address?: string; city?: string; district?: string };
  @Prop({ required: true }) scheduled_at: Date;
  @Prop() instructions?: string; 
  @Prop({ type: Object }) referral?: { name?: string; mime?: string; base64?: string };
  @Prop({ default: RadiologyBookingState.PENDING, enum: Object.values(RadiologyBookingState) }) state: RadiologyBookingState;
  @Prop({ default: [] }) state_history: any[]; 
  @Prop({ default: [] }) reports: any[]; 
  @Prop() technician_id?: string;
  @Prop() notes?: string;
  @Prop({ enum: ['cash', 'card', 'insurance'], default: 'cash' }) payment_method: string;
  @Prop() insurance_provider?: string;
  @Prop() insurance_member_id?: string;
  @Prop({ enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' }) insurance_status: string;
  @Prop({ type: InsuranceDetailsSchema }) insurance_details?: InsuranceDetails;
  @Prop({ type: [Object], default: [] }) documents: Array<{ kind: string; url_or_b64: string; filename?: string; uploaded_at: Date }>;
  
  @Prop({ default: false }) medical_referral_required: boolean;
  @Prop({ type: [String], default: [] }) prescriptionFiles: string[];
  @Prop({ type: [String], default: [] }) medicalReports: string[];
  @Prop({ type: [String], default: [] }) referralFiles: string[];
  @Prop() medicalJustification?: string;

  @Prop() provider_account_id?: string;
  @Prop() rejection_reason?: string;

  @Prop({ type: String, default: null }) allocated_machine_id?: string;
  @Prop({ type: [String], default: [] }) scanned_files_s3_urls: string[];
  @Prop({ type: String, default: null }) signed_report_pdf_url?: string;
  @Prop({ type: String, default: null }) clinical_impression_report?: string;
  @Prop({ required: true, enum: ['IN_CENTER', 'MOBILE_HOME_VISIT'], default: 'IN_CENTER' }) delivery_mode: string;
  @Prop() scan_type_code?: string;
  @Prop() scan_name_ar?: string;
  @Prop() scan_name_en?: string;

  // PILLAR 5: Abort Edge Case
  @Prop({ enum: ['PATIENT_PANIC', 'MACHINE_FAILURE', 'CONTRAST_REACTION', 'CLAUSTROPHOBIA', 'PATIENT_NO_SHOW', 'TECHNICAL_ERROR', 'EMERGENCY_SHUTDOWN'] }) abort_reason?: string;

  // MODULE 10: Report Quality Workflow
  @Prop({ enum: ['draft', 'under_review', 'ready'], default: 'draft' }) report_status?: string;
  @Prop() report_approved_by?: string;
  @Prop() report_approved_at?: Date;

  // PILLAR 6: DICOM & Images
  @Prop() dicom_url?: string;                      // External PACS/DICOM cloud viewer URL
  @Prop({ type: [String], default: [] }) scan_image_urls: string[]; // JPEG/PNG slices

  // MODULE 12: Patient Preparation Validation
  @Prop() preparation_confirmed_at?: Date;
  @Prop({ default: false }) preparation_confirmed: boolean;

  // PILLAR 3: Safety Questionnaire answers (stored at booking time)
  @Prop({ type: Object }) safety_questionnaire?: {
    is_pregnant?: boolean;
    has_metal_implant?: boolean;
    has_pacemaker?: boolean;
    has_contrast_allergy?: boolean;
    last_creatinine_date?: string;
    confirmed_at?: Date;
  };

  // PILLAR 5: Timestamps
  @Prop() checkin_at?: Date;
  @Prop() scan_started_at?: Date;
  @Prop() scan_completed_at?: Date;

  // MODULE 14: Rebooking
  @Prop() reschedule_reason?: string;
  @Prop() insurance_copay?: number;
  @Prop() insurance_approval_code?: string;

  // MODULE 11: Doctor referral sync
  @Prop() referring_doctor_id?: string;
  @Prop({ default: false }) doctor_notified: boolean;
}
export const RadiologyBookingSchema = SchemaFactory.createForClass(RadiologyBooking);
RadiologyBookingSchema.index({ patient_id: 1, createdAt: -1 });
RadiologyBookingSchema.index({ state: 1, scheduled_at: 1 });


