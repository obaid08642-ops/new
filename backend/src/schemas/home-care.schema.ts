import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { trackingId, TRACK_PREFIX } from '../common/tracking';
import { InsuranceDetails, InsuranceDetailsSchema } from './insurance.schema';

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
  NO_SHOW = 'NO_SHOW',
  ESCALATED_EMERGENCY = 'ESCALATED_EMERGENCY',
}
export const HomeCareBookingState = NursingBookingState;

@Schema({ timestamps: true })
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
  
  @Prop({ default: true }) active: boolean;
}
export const HomeCareServiceSchema = SchemaFactory.createForClass(HomeCareService);


@Schema({ timestamps: true })
export class HomeCareBooking extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ unique: true, default: () => trackingId(TRACK_PREFIX.home_care) }) tracking_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) service_name_ar: string;
  @Prop({ required: true }) duration: string;
  @Prop({ required: true }) total: number;
  
  // Pricing breakdown
  @Prop({ default: 0 }) service_fee: number;
  @Prop({ default: 0 }) total_price: number;

  @Prop({ type: Object }) address?: { lat?: number; lng?: number; address?: string; city?: string; district?: string };
  @Prop({ required: true }) scheduled_at: Date;
  @Prop({ default: NursingBookingState.NEW_REQUEST, enum: Object.values(NursingBookingState) }) state: NursingBookingState;
  @Prop({ default: [] }) state_history: any[];
  
  @Prop() provider_id?: string;
  @Prop() provider_name?: string;
  @Prop() provider_phone?: string;
  
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
  @Prop() recommendations?: string;
  @Prop() follow_up_instructions?: string;
  @Prop({ type: [Object], default: [] }) pending_supply_requests?: {
    requested_at: Date;
    nurse_id: string;
    items: { name: string; qty: number; unit: string; status: 'PENDING' | 'APPROVED' | 'DISPATCHED' | 'DELIVERED' }[];
  }[];
  
  // Photos (Module 12)
  @Prop() before_procedure_image?: string;
  @Prop() after_procedure_image?: string;
  @Prop() patient_signature_base64?: string;
  @Prop({ type: Object }) provider_attestation?: { provider_id: string; provider_name?: string; attested_at: Date };

  // Emergency & Abort (Pillar 5)
  @Prop({ type: Object, default: {} }) emergency_escalation: { reason?: string; refunded_amount?: number; at?: Date };

  // Audit Trail (Module 18)
  @Prop({ default: [] }) audit_trail: { action: string; timestamp: Date; userId?: string; device?: string }[];

  // Doctor Sync (Module 13)
  @Prop() referring_doctor_id?: string;
  
  // Ratings (Module 15)
  @Prop({ type: Object, default: {} }) rating: { score?: number; comment?: string };
}
export const HomeCareBookingSchema = SchemaFactory.createForClass(HomeCareBooking);
HomeCareBookingSchema.index({ patient_id: 1, createdAt: -1 });
HomeCareBookingSchema.index({ state: 1, scheduled_at: 1 });

HomeCareBookingSchema.pre('save', function (next) {
  const self = this as any;
  self.total_price = self.service_fee || 0;
  self.total = self.total_price;
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
}
export const NurseProviderSchema = SchemaFactory.createForClass(NurseProvider);

@Schema({ timestamps: true })
export class NursingVisitReport extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) booking_id: string;
  @Prop({ required: true }) patient_id: string;
  @Prop({ required: true }) nurse_id: string;
  @Prop({ type: Object }) vital_signs?: any;
  @Prop() notes?: string;
  @Prop({ type: [String] }) procedures_performed?: string[];
}
export const NursingVisitReportSchema = SchemaFactory.createForClass(NursingVisitReport);
