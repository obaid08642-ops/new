import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { trackingId, TRACK_PREFIX } from '../common/tracking';
import { InsuranceDetails, InsuranceDetailsSchema } from './insurance.schema';

@Schema({ timestamps: true })
export class LabService extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true }) name_ar: string;
  @Prop({ required: true }) name_en: string;
  @Prop() short_code?: string; // e.g., CBC, FBS, TSH
  @Prop() description_ar?: string;
  @Prop() description_en?: string;
  @Prop({ required: true, index: true }) category: string; // blood | hormones | diabetes | vitamins | cardiac | imaging | kidney | liver
  @Prop({ default: 'blood' }) sample_type: string; // blood | urine | imaging | swab
  @Prop({ required: true }) price: number;
  @Prop({ default: 0 }) old_price?: number;
  @Prop({ default: false }) fasting_required: boolean;
  @Prop({ default: 8 }) fasting_hours?: number;
  @Prop({ default: true }) home_visit_supported: boolean;
  @Prop({ default: true }) facility_visit_supported: boolean;
  @Prop({ default: 24 }) turnaround_hours: number;
  @Prop({ default: [] }) preparation_ar: string[];
  @Prop({ default: [] }) preparation_en: string[];
  @Prop({ default: false }) is_package: boolean;
  @Prop({ default: [] }) included_services: string[]; // for packages
  @Prop({ default: 0 }) popularity: number;
  @Prop({ default: true }) active: boolean;
  @Prop({ default: false }) unavailable: boolean; // admin manual flag
  @Prop({ default: false }) medical_referral_required: boolean;
  @Prop({ default: false }) is_deleted: boolean;
  @Prop({ default: 1 }) version: number;

  // Added per Addendum
  @Prop({ default: true }) cash_availability: boolean;
  @Prop({ default: true }) insurance_availability: boolean;
  @Prop({ default: true }) home_collection_availability: boolean;
  @Prop({ default: true }) in_lab_availability: boolean;
  @Prop() special_notes?: string;
  @Prop({ type: Object }) reference_ranges?: { min: number; max: number; unit: string };
}
export const LabServiceSchema = SchemaFactory.createForClass(LabService);
LabServiceSchema.index({ name_ar: 'text', name_en: 'text' });
LabServiceSchema.index({ category: 1, popularity: -1 });

export enum LabBookingState {
  NEW_REQUEST = 'NEW_REQUEST',
  PENDING_INSURANCE = 'PENDING_INSURANCE',
  WAITING_COPAY = 'WAITING_COPAY',
  CONFIRMED = 'CONFIRMED',
  IN_TRANSIT = 'IN_TRANSIT',
  SAMPLE_COLLECTED = 'SAMPLE_COLLECTED',
  PROCESSING = 'PROCESSING',
  RESULT_UPLOADED = 'RESULT_UPLOADED',
  REPORTED = 'REPORTED',
  SAMPLE_REJECTED = 'SAMPLE_REJECTED',
  CANCELLED = 'CANCELLED',
}

export const LAB_BOOKING_TRANSITIONS: Record<string, any[]> = {
  [LabBookingState.NEW_REQUEST]: [LabBookingState.PENDING_INSURANCE, LabBookingState.CONFIRMED, LabBookingState.CANCELLED],
  [LabBookingState.PENDING_INSURANCE]: [LabBookingState.WAITING_COPAY, LabBookingState.CANCELLED],
  [LabBookingState.WAITING_COPAY]: [LabBookingState.CONFIRMED, LabBookingState.CANCELLED],
  [LabBookingState.CONFIRMED]: [LabBookingState.IN_TRANSIT, LabBookingState.SAMPLE_COLLECTED, LabBookingState.CANCELLED],
  [LabBookingState.IN_TRANSIT]: [LabBookingState.SAMPLE_COLLECTED, LabBookingState.CANCELLED],
  [LabBookingState.SAMPLE_COLLECTED]: [LabBookingState.PROCESSING, LabBookingState.SAMPLE_REJECTED],
  [LabBookingState.PROCESSING]: [LabBookingState.RESULT_UPLOADED, LabBookingState.SAMPLE_REJECTED],
  [LabBookingState.RESULT_UPLOADED]: [],
  [LabBookingState.SAMPLE_REJECTED]: [LabBookingState.CONFIRMED, LabBookingState.CANCELLED],
  [LabBookingState.CANCELLED]: [],
};

@Schema({ timestamps: true })
export class LabBooking extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ unique: true, default: () => trackingId(TRACK_PREFIX.lab_booking) }) tracking_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() patient_name?: string;
  @Prop() patient_phone?: string;
  @Prop({ type: [Object], default: [] }) items: any[]; // [{service_id, name_ar, name_en, price, isCovered, rejectReason, cashPrice, optInCash, sample_type, fasting_required}]
  @Prop({ required: true }) total: number;

  // Pricing breakdown
  @Prop({ default: 0 }) service_fee: number;
  @Prop({ default: 0 }) home_visit_fee: number;
  @Prop({ default: 0 }) transportation_fee: number;
  @Prop({ default: 0 }) total_price: number;

  @Prop({ enum: ['home', 'facility'], default: 'home' }) location_type: string;
  @Prop() facility_id?: string;
  @Prop({ type: Object }) address?: { lat?: number; lng?: number; address?: string; city?: string; district?: string };
  @Prop({ required: true }) scheduled_at: Date;
  @Prop({ default: LabBookingState.NEW_REQUEST, enum: Object.values(LabBookingState) }) state: LabBookingState;
  @Prop({ default: [] }) state_history: any[];
  @Prop({ default: [] }) reports: any[]; // [{name, url_base64, uploaded_at}]
  @Prop() technician_id?: string;
  @Prop() notes?: string;
  @Prop({ enum: ['cash', 'card', 'insurance'], default: 'cash' }) payment_method: string;
  @Prop() insurance_provider?: string;
  @Prop() insurance_member_id?: string;
  @Prop({ enum: ['none', 'pending', 'approved', 'rejected', 'partial_approval'], default: 'none' }) insurance_status: string;
  @Prop({ default: 0 }) insurance_copay: number;
  @Prop({ type: InsuranceDetailsSchema }) insurance_details?: InsuranceDetails;
  @Prop({ type: [Object], default: [] }) documents: Array<{ kind: 'prescription' | 'doctor_request' | 'preauth' | 'previous_report'; url_or_b64: string; filename?: string; uploaded_at: Date }>;
  
  // Referral requirements
  @Prop({ default: false }) medical_referral_required: boolean;
  @Prop({ type: [String], default: [] }) prescriptionFiles: string[];
  @Prop({ type: [String], default: [] }) medicalReports: string[];
  @Prop({ type: [String], default: [] }) referralFiles: string[];
  @Prop() medicalJustification?: string;

  @Prop() provider_account_id?: string; // serving provider/center
  @Prop() rejection_reason?: string;

  // Added per Addendum edge cases
  @Prop() reschedule_reason?: string;
  @Prop() emergency_reason?: string;
  @Prop() reject_reason?: string;
  @Prop({ type: Object }) gps_location?: { lat?: number; lng?: number; eta?: number; distance?: number };
}
export const LabBookingSchema = SchemaFactory.createForClass(LabBooking);
LabBookingSchema.index({ patient_id: 1, createdAt: -1 });
LabBookingSchema.index({ state: 1, scheduled_at: 1 });

@Schema({ timestamps: true, collection: 'lab_samples' })
export class LabSample extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) lab_order_id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, unique: true, index: true }) barcode: string;
  @Prop({ type: [String], default: [] }) tests: string[];
  @Prop({ type: String, enum: ['received', 'analyzing', 'result_ready', 'sent'], default: 'received' }) stage: 'received' | 'analyzing' | 'result_ready' | 'sent';
  @Prop() assigned_to?: string;
  @Prop() notes?: string;
}
export const LabSampleSchema = SchemaFactory.createForClass(LabSample);
LabSampleSchema.index({ provider_account_id: 1, createdAt: -1 });
