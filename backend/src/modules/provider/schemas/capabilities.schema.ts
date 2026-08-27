import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ProviderRequestType } from './requests.schema';

// ============ SERVICE CAPABILITIES (per-type catalogs) ============

@Schema({ timestamps: true, collection: 'provider_capabilities_pharmacy' })
export class PharmacyInventoryItem extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true }) sku: string;
  @Prop({ required: true }) name_ar: string;
  @Prop() name_en?: string;
  @Prop() barcode?: string;
  @Prop() category?: string;
  // Phase 2A additive fields (no breaking change):
  @Prop() generic_name?: string;
  @Prop() form?: string;     // tablet, capsule, syrup, injection, cream
  @Prop() dosage?: string;   // 500mg, 200ml
  @Prop() pack_size?: string;
  @Prop({ type: [String], default: [] }) substitute_skus: string[];
  @Prop({ default: 0 }) min_stock_alert: number;
  @Prop() last_restocked_at?: Date;
  // /Phase 2A additive
  @Prop({ default: 0 }) stock: number;
  @Prop({ required: true, default: 0 }) price: number;
  @Prop({ default: 'SAR' }) currency: string;
  @Prop({ default: true }) available: boolean;
  @Prop() expiry_date?: Date;
  @Prop() notes?: string;
}
export const PharmacyInventoryItemSchema = SchemaFactory.createForClass(PharmacyInventoryItem);
PharmacyInventoryItemSchema.index({ provider_account_id: 1, sku: 1 }, { unique: true });
PharmacyInventoryItemSchema.index({ provider_account_id: 1, available: 1 });

@Schema({ timestamps: true, collection: 'provider_capabilities_lab' })
export class LabTestCatalogItem extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true }) code: string;
  @Prop({ required: true }) name_ar: string;
  @Prop() name_en?: string;
  @Prop() sample_type?: string; // blood, urine, swab, etc
  @Prop({ default: 24 }) turnaround_hours: number;
  @Prop({ default: false }) home_collection_supported: boolean;
  @Prop({ required: true, default: 0 }) price: number;
  @Prop({ default: 'SAR' }) currency: string;
  @Prop({ default: true }) available: boolean;
}
export const LabTestCatalogItemSchema = SchemaFactory.createForClass(LabTestCatalogItem);
LabTestCatalogItemSchema.index({ provider_account_id: 1, code: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'provider_capabilities_radiology' })
export class RadiologyServiceCatalogItem extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true }) scan_type: string; // MRI, CT, X-Ray, Ultrasound
  @Prop({ required: true }) body_part: string;
  @Prop() name_ar?: string;
  @Prop() name_en?: string;
  @Prop({ default: false }) contrast_supported: boolean;
  @Prop({ required: true, default: 0 }) price: number;
  @Prop({ default: 'SAR' }) currency: string;
  @Prop({ default: true }) available: boolean;
}
export const RadiologyServiceCatalogItemSchema = SchemaFactory.createForClass(RadiologyServiceCatalogItem);
RadiologyServiceCatalogItemSchema.index({ provider_account_id: 1, scan_type: 1, body_part: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'provider_capabilities_doctor_sessions' })
export class DoctorSessionType extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true }) consultation_type: string; // video | voice | chat | clinic | home
  @Prop({ required: true }) specialty: string;
  @Prop({ default: 30 }) duration_minutes: number;
  @Prop({ required: true, default: 0 }) price: number;
  @Prop({ default: 'SAR' }) currency: string;
  @Prop({ default: true }) available: boolean;
}
export const DoctorSessionTypeSchema = SchemaFactory.createForClass(DoctorSessionType);
DoctorSessionTypeSchema.index({ provider_account_id: 1, consultation_type: 1, specialty: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'provider_capabilities_home_care' })
export class HomeCareServiceCatalogItem extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true }) service_type: string; // nursing_visit, physio, wound_care
  @Prop() name_ar?: string;
  @Prop({ default: [], type: [String] }) required_skills: string[];
  @Prop({ default: 1 }) min_hours: number;
  @Prop({ required: true, default: 0 }) hourly_price: number;
  @Prop({ default: 'SAR' }) currency: string;
  @Prop({ default: true }) available: boolean;
}
export const HomeCareServiceCatalogItemSchema = SchemaFactory.createForClass(HomeCareServiceCatalogItem);
HomeCareServiceCatalogItemSchema.index({ provider_account_id: 1, service_type: 1 }, { unique: true });

// ============ DELIVERY ZONES (geographic service areas) ============
@Schema({ timestamps: true, collection: 'provider_delivery_zones' })
export class ProviderDeliveryZone extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true }) name: string;
  @Prop({ default: 'circle', enum: ['circle', 'polygon'] }) shape: 'circle' | 'polygon';
  // For circle: center+radius_km. For polygon: GeoJSON-like array of {lat,lng}
  @Prop({ type: Object }) center?: { lat: number; lng: number };
  @Prop({ default: 0 }) radius_km: number;
  @Prop({ type: [Object], default: [] }) polygon?: Array<{ lat: number; lng: number }>;
  @Prop({ default: 0 }) base_fee: number;
  @Prop({ default: 0 }) free_delivery_above: number;
  @Prop({ default: true }) active: boolean;
}
export const ProviderDeliveryZoneSchema = SchemaFactory.createForClass(ProviderDeliveryZone);
ProviderDeliveryZoneSchema.index({ provider_account_id: 1, active: 1 });

// ============ SCHEDULING SLOTS (weekly recurring) ============
@Schema({ timestamps: true, collection: 'provider_schedule_slots' })
export class ProviderScheduleSlot extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true, min: 0, max: 6 }) day_of_week: number; // 0=Sunday..6=Saturday
  @Prop({ required: true }) start_time: string; // HH:MM 24h
  @Prop({ required: true }) end_time: string; // HH:MM
  @Prop({ default: 30 }) slot_duration_minutes: number;
  @Prop({ default: 1 }) capacity_per_slot: number; // parallel bookings allowed
  @Prop({ default: true }) active: boolean;
  @Prop() note?: string;
}
export const ProviderScheduleSlotSchema = SchemaFactory.createForClass(ProviderScheduleSlot);
ProviderScheduleSlotSchema.index({ provider_account_id: 1, day_of_week: 1, start_time: 1 });

// ============ ASSIGNMENT (matching results + state) ============
export enum AssignmentStrategy {
  AUTO_BEST = 'auto_best',
  BROADCAST = 'broadcast',
  MANUAL = 'manual',
}

export enum AssignmentAttemptStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  TIMED_OUT = 'timed_out',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true, collection: 'provider_assignment_attempts' })
export class ProviderAssignmentAttempt extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) request_id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true, default: 1 }) attempt_index: number;
  @Prop({ required: true, default: AssignmentStrategy.AUTO_BEST, enum: Object.values(AssignmentStrategy) }) strategy: AssignmentStrategy;
  @Prop({ required: true, default: AssignmentAttemptStatus.PENDING, enum: Object.values(AssignmentAttemptStatus), index: true }) status: AssignmentAttemptStatus;
  @Prop({ required: true, default: () => new Date() }) sent_at: Date;
  @Prop() responded_at?: Date;
  @Prop({ default: 120 }) timeout_seconds: number;
  @Prop({ required: true }) expires_at: Date;
  @Prop({ type: Object }) score?: any; // matching breakdown
  @Prop() rejection_reason?: string;
}
export const ProviderAssignmentAttemptSchema = SchemaFactory.createForClass(ProviderAssignmentAttempt);
ProviderAssignmentAttemptSchema.index({ request_id: 1, attempt_index: 1 });
ProviderAssignmentAttemptSchema.index({ provider_account_id: 1, status: 1, createdAt: -1 });

// ============ PROVIDER SCORING (aggregated KPIs) ============
@Schema({ timestamps: true, collection: 'provider_scores' })
export class ProviderScoreSnapshot extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, unique: true, index: true }) provider_account_id: string;
  @Prop({ default: 0 }) total_requests: number;
  @Prop({ default: 0 }) total_accepted: number;
  @Prop({ default: 0 }) total_rejected: number;
  @Prop({ default: 0 }) total_completed: number;
  @Prop({ default: 0 }) total_cancelled: number;
  @Prop({ default: 0 }) acceptance_rate: number; // 0..1
  @Prop({ default: 0 }) completion_rate: number; // 0..1
  @Prop({ default: 0 }) avg_response_seconds: number;
  @Prop({ default: 0 }) avg_completion_minutes: number;
  @Prop({ default: 0 }) reliability_score: number; // 0..100 composite
  @Prop() last_calculated_at?: Date;
}
export const ProviderScoreSnapshotSchema = SchemaFactory.createForClass(ProviderScoreSnapshot);

export const REQUEST_TYPE_TO_PROVIDER_TYPES: Record<string, string[]> = {
  pharmacy: ['pharmacy', 'hospital'],
  lab: ['laboratory', 'hospital'],
  radiology: ['radiology', 'hospital'],
  doctor: ['doctor', 'clinic', 'hospital', 'telemedicine'],
  home_care: ['home_care', 'nursing', 'physiotherapy', 'hospital'],
};

export function eligibleProviderTypesFor(reqType: ProviderRequestType | string): string[] {
  return REQUEST_TYPE_TO_PROVIDER_TYPES[reqType as string] || [];
}
