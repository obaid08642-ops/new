import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { trackingId, TRACK_PREFIX } from '../common/tracking';
import { InsuranceDetails, InsuranceDetailsSchema } from './insurance.schema';

/** Supported locale keys (tl = Filipino/Tagalog). */
export const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'] as const;
export type Locale = (typeof LOCALES)[number];

export enum NursingBookingState {
  NEW_REQUEST = 'NEW_REQUEST',
  PENDING_INSURANCE = 'PENDING_INSURANCE',
  WAITING_COPAY = 'WAITING_COPAY',
  CONFIRMED = 'CONFIRMED',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  CARE_IN_PROGRESS = 'CARE_IN_PROGRESS',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PROVIDER_ASSIGNED = 'PROVIDER_ASSIGNED',
  NO_SHOW = 'NO_SHOW',
  ESCALATED_EMERGENCY = 'ESCALATED_EMERGENCY',
  CANCELLED = 'CANCELLED',
}
export const HomeCareBookingState = NursingBookingState;

@Schema({ timestamps: true, collection: 'nursing_services' })
export class HomeCareService extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true }) name_ar: string;
  @Prop({ required: true }) name_en: string;
  @Prop() description_ar?: string;
  @Prop() description_en?: string;
  @Prop({ required: true, index: true }) category: string; // nursing | physio | elderly | baby | iv | wound | injection | post_op | followup
  @Prop({ default: 'general' }) icon: string;
  @Prop({ required: true }) price: number;
  @Prop({ required: true }) duration: string; // hour | shift
  @Prop({ default: 1 }) duration_value: number;
  
  // Prerequisites (Module 2)
  @Prop({ default: false }) requires_patient_medication: boolean;
  @Prop({ default: false }) requires_companion: boolean;
  @Prop({ default: true }) cash_availability: boolean;
  @Prop({ default: true }) insurance_availability: boolean;

  @Prop() image_url?: string; // Cloudinary catalog image (category-level visual)
  @Prop({ default: true }) active: boolean;
  @Prop({ default: false }) is_deleted: boolean; // soft delete — bookings keep history
  // Public eligibility is a reviewed governance decision, not an operational default.
  @Prop({ default: false, index: true }) public_eligibility: boolean;
  @Prop({ default: false, index: true }) indexing_eligibility: boolean;
  @Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true })
  medical_review_status: string;
  @Prop() last_reviewed?: Date;
  @Prop() provenance?: string;
  @Prop({ default: 0 }) popularity: number;
  
  /** Per-locale translations for 6 languages (ar, en, ur, hi, bn, tl). */
  @Prop({ type: Object, default: {} }) translations: Record<string, Record<string, unknown>>;
}
export const HomeCareServiceSchema = SchemaFactory.createForClass(HomeCareService);

// Per-locale public URL slugs — every locale resolves its own slug without
// mixing languages. Sparse so pre-v14 documents (no localized slugs) are exempt.
for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'tl']) {
  HomeCareServiceSchema.index({ [`translations.${lang}.slug`]: 1 }, { unique: true, sparse: true });
}


@Schema({ timestamps: true })
export class HomeCareBooking extends Document {
  // Written by the services but previously undeclared: strict mode silently dropped these (tools/audit/schemadrift.js).
  @Prop({ type: [Object], default: [] }) supply_requests?: Array<{ id: string; items: any[]; at: Date; by: string; state: string }>;
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ unique: true, default: () => trackingId(TRACK_PREFIX.home_care) }) tracking_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() patient_name?: string;
  @Prop() patient_phone?: string;
  @Prop({ index: true }) service_id?: string;
  @Prop({ required: true }) service_name_ar: string;
  @Prop() service_name_en?: string;
  @Prop() notes?: string;
  @Prop({ default: 1 }) sessions_count: number;
  @Prop({ required: true }) duration: string;
  @Prop({ required: true }) total: number;
  
  // Pricing breakdown
  @Prop({ default: 0 }) service_fee: number;
  @Prop({ default: 0 }) home_visit_fee: number;
  @Prop({ default: 0 }) transportation_fee: number;
  @Prop({ default: 0 }) total_price: number;

  @Prop({ type: Object }) address?: { lat?: number; lng?: number; address?: string; city?: string; district?: string };
  @Prop({ required: true }) scheduled_at: Date;
  @Prop({ default: NursingBookingState.NEW_REQUEST, enum: Object.values(NursingBookingState) }) state: NursingBookingState;
  @Prop({ default: [] }) state_history: any[];
  
  @Prop() provider_id?: string;
  @Prop() provider_name?: string;
  @Prop() provider_phone?: string;
  /** Nurses who declined this open request (it stays open for the others). */
  @Prop({ type: [String], default: undefined }) declined_by?: string[];
  
  @Prop() payment_method?: string;
  @Prop({ enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' }) insurance_status: string;
  @Prop({ type: InsuranceDetailsSchema }) insurance_details?: InsuranceDetails;

  // Pre-Visit Checklist (Module 9)
  @Prop({ type: Object, default: {} }) checklist: {
    meds_available?: boolean;
    medical_supplies_available?: boolean;
    patient_reachable?: boolean;
    exact_location_confirmed?: boolean;
    gate_code?: string;
    parking_instructions?: string;
  };

  // Timers & Geofencing (Pillar 4)
  @Prop({ type: Object, default: {} }) gps_tracking: { current_lat?: number; current_lng?: number; last_updated?: Date };
  @Prop({ type: Object, default: {} }) timers: {
    transit_started_at?: Date;
    arrived_at?: Date;
    care_started_at?: Date;
    completed_at?: Date;
    no_show_timer_started_at?: Date;
  };

  // Clinical Documentation (Pillar 5 & Modules 10, 12, 14)
  @Prop({ type: Object, default: {} }) vitals: {
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
  @Prop() clinical_notes?: string;
  @Prop() procedure_notes?: string;
  @Prop() medication_administered?: string;
  @Prop() consumables_used?: string;
  @Prop({ type: [String], default: undefined }) recommendations?: string[]; // CompleteVisitDto sends a list
  @Prop() follow_up_instructions?: string;
  
  // Photos (Module 12)
  @Prop() before_procedure_image?: string;
  @Prop() after_procedure_image?: string;
  @Prop() patient_signature_base64?: string;

  // Emergency & Abort (Pillar 5)
  @Prop({ type: Object, default: {} }) emergency_escalation: { reason?: string; refunded_amount?: number; at?: Date };

  // Audit Trail (Module 18)
  @Prop({ default: [] }) audit_trail: { action: string; timestamp: Date; userId?: string; device?: string }[];

  // Doctor Sync (Module 13)
  @Prop() referring_doctor_id?: string;
  
  // Ratings (Module 15)
  @Prop({ type: Object, default: {} }) rating: { score?: number; comment?: string };
  // Written by payments verify / finance refunds through a dynamically chosen model (strict mode dropped them).
  @Prop() payment_status?: string;              // paid | refunded | partially_refunded (payments verify / finance refund)
  @Prop() transaction_id?: string;
  @Prop() paid_at?: Date;
  @Prop() refund_status?: string;
}
export const HomeCareBookingSchema = SchemaFactory.createForClass(HomeCareBooking);
HomeCareBookingSchema.index({ patient_id: 1, createdAt: -1 });
HomeCareBookingSchema.index({ state: 1, scheduled_at: 1 });

HomeCareBookingSchema.pre('save', function (next) {
  const self = this as any;
  // Never overwrite an explicitly computed total: only fall back to the fee
  // fields when the service left them unset. (Previously this hook zeroed every
  // booking's total — patients were charged nothing and providers earned nothing.)
  if (self.total_price == null) self.total_price = self.service_fee || 0;
  if (self.total == null) self.total = self.total_price;
  next();
});

@Schema({ timestamps: true, collection: 'nurse_providers' })
export class NurseProvider extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true }) name_ar: string;
  @Prop({ required: true }) name_en: string;
  @Prop({ required: true }) facility_name: string;
  @Prop({ default: 0 }) distance_km: number;
  @Prop({ required: true }) price: number;
  @Prop({ default: true }) available_now: boolean;

  /** Per-locale translations for 6 languages (ar, en, ur, hi, bn, tl). */
  @Prop({ type: Object, default: {} }) translations: Record<string, Record<string, unknown>>;
}
export const NurseProviderSchema = SchemaFactory.createForClass(NurseProvider);

// Per-locale public URL slugs — every locale resolves its own slug without
// mixing languages. Sparse so pre-v14 documents (no localized slugs) are exempt.
for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'tl']) {
  NurseProviderSchema.index({ [`translations.${lang}.slug`]: 1 }, { unique: true, sparse: true });
}

@Schema({ timestamps: true })
export class NursingVisitReport extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) booking_id: string;
  @Prop({ required: true }) patient_id: string;
  @Prop({ required: true }) nurse_id: string;
  @Prop() check_in_time?: Date;
  @Prop() check_out_time?: Date;
  @Prop() gps_lat?: number;
  @Prop() gps_lng?: number;
  @Prop({ type: [String] }) completed_tasks?: string[];
  @Prop({ type: Object }) vitals_logged?: any;
  @Prop({ type: Object }) vital_signs?: any;
  @Prop() notes?: string;
  @Prop({ type: [String] }) procedures_performed?: string[];
}
export const NursingVisitReportSchema = SchemaFactory.createForClass(NursingVisitReport);

// ─── Care Plan (nurse/doctor-authored task plan for a patient) ──────────────
@Schema({ timestamps: true })
export class CarePlan extends Document {
  @Prop({ index: true }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() doctor_id?: string;
  @Prop() nurse_id?: string;
  @Prop({ required: true }) title: string;
  @Prop() description?: string;
  @Prop({ type: [String], default: [] }) tasks: string[];
  @Prop({ default: 'active', index: true }) status: string; // active | completed | cancelled
}
export const CarePlanSchema = SchemaFactory.createForClass(CarePlan);

// ─── Home Care Package (sellable bundle of visits) ──────────────────────────
@Schema({ timestamps: true })
export class HomeCarePackage extends Document {
  @Prop({ required: true }) name_ar: string;
  @Prop() name_en?: string;
  @Prop() description_ar?: string;
  @Prop() description_en?: string;
  @Prop({ required: true }) price: number;
  @Prop({ default: 1 }) visits_count: number;
  @Prop({ default: 30 }) duration_days: number;
  @Prop({ type: [String], default: [] }) service_ids: string[];
  @Prop({ default: true, index: true }) active: boolean;

  /** Per-locale translations for 6 languages (ar, en, ur, hi, bn, tl). */
  @Prop({ type: Object, default: {} }) translations: Record<string, Record<string, unknown>>;
}
export const HomeCarePackageSchema = SchemaFactory.createForClass(HomeCarePackage);

// Per-locale public URL slugs — every locale resolves its own slug without
// mixing languages. Sparse so pre-v14 documents (no localized slugs) are exempt.
for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'tl']) {
  HomeCarePackageSchema.index({ [`translations.${lang}.slug`]: 1 }, { unique: true, sparse: true });
}

// ─── Medical Supply Request (nurse requests supplies after a visit) ─────────
@Schema({ timestamps: true })
export class MedicalSupplyRequest extends Document {
  @Prop({ index: true }) id: string;
  @Prop({ required: true, index: true }) visit_report_id: string;
  @Prop({ required: true, index: true }) nurse_id: string;
  @Prop({
    type: [{ name: { type: String, required: true }, qty: { type: Number, required: true }, unit: { type: String, default: 'pcs' }, status: { type: String, default: 'pending' } }],
    default: [],
  })
  items: any[];
  @Prop({ default: 'pending', index: true }) status: string; // pending | approved | dispatched | delivered | rejected
}
export const MedicalSupplyRequestSchema = SchemaFactory.createForClass(MedicalSupplyRequest);
