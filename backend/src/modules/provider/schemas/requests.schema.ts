import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// ===================== REQUEST TYPES =====================
export enum ProviderRequestType {
  PHARMACY = 'pharmacy',
  LAB = 'lab',
  RADIOLOGY = 'radiology',
  DOCTOR = 'doctor',
  HOME_CARE = 'home_care',
}

export enum ProviderRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const PROVIDER_REQUEST_TRANSITIONS: Record<ProviderRequestStatus, ProviderRequestStatus[]> = {
  [ProviderRequestStatus.PENDING]: [ProviderRequestStatus.ACCEPTED, ProviderRequestStatus.REJECTED, ProviderRequestStatus.CANCELLED],
  [ProviderRequestStatus.ACCEPTED]: [ProviderRequestStatus.IN_PROGRESS, ProviderRequestStatus.COMPLETED, ProviderRequestStatus.CANCELLED],
  [ProviderRequestStatus.IN_PROGRESS]: [ProviderRequestStatus.COMPLETED, ProviderRequestStatus.CANCELLED],
  [ProviderRequestStatus.REJECTED]: [],
  [ProviderRequestStatus.COMPLETED]: [],
  [ProviderRequestStatus.CANCELLED]: [],
};

export enum ProviderRequestPriority { URGENT = 'urgent', NORMAL = 'normal', LOW = 'low' }

// ===================== UNIFIED PROVIDER REQUEST =====================
@Schema({ timestamps: true, collection: 'provider_requests' })
export class ProviderRequest extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: false, index: true, default: null }) provider_account_id: string | null;
  @Prop({ required: true, enum: Object.values(ProviderRequestType), index: true }) type: ProviderRequestType;
  @Prop({ required: true, default: ProviderRequestStatus.PENDING, enum: Object.values(ProviderRequestStatus), index: true }) status: ProviderRequestStatus;
  @Prop({ default: ProviderRequestPriority.NORMAL, enum: Object.values(ProviderRequestPriority) }) priority: ProviderRequestPriority;

  // ---- Assignment / Matching (Phase 1C) ----
  @Prop({ default: 'assigned', enum: ['unassigned', 'matching', 'broadcasted', 'assigned', 'failed'], index: true }) assignment_state: 'unassigned' | 'matching' | 'broadcasted' | 'assigned' | 'failed';
  @Prop({ default: 'manual', enum: ['auto_best', 'broadcast', 'manual'] }) assignment_strategy: 'auto_best' | 'broadcast' | 'manual';
  @Prop() assignment_timeout_at?: Date;
  @Prop({ type: [String], default: [] }) attempted_provider_ids: string[];
  @Prop({ type: Object }) patient_location?: { lat: number; lng: number; address?: string };
  @Prop({ type: Object }) match_breakdown?: any; // last ranking snapshot

  // Patient (denormalized)
  @Prop({ type: Object, required: true }) patient: {
    id?: string;
    name: string;
    phone?: string;
    age?: number;
    gender?: string;
    avatar_url?: string;
  };

  // Type-specific payload
  @Prop({ type: Object, required: true, default: {} }) payload: any;

  // Display fields (derived, for fast list rendering)
  @Prop() summary_ar?: string;
  @Prop() summary_en?: string;

  // Scheduling
  @Prop() scheduled_at?: Date;
  @Prop() scheduled_slot_minutes?: number; // duration in minutes

  // Pricing
  @Prop({ default: 0 }) amount_total: number;
  @Prop({ default: 'SAR' }) currency: string;

  // State machine artifacts
  @Prop({ type: [Object], default: [] }) timeline: Array<{
    at: Date;
    status: ProviderRequestStatus;
    by_role: 'patient' | 'provider' | 'system';
    by_user_id: string;
    note?: string;
  }>;

  @Prop({ type: [Object], default: [] }) provider_action_log: Array<{
    at: Date;
    action: 'accept' | 'reject' | 'start' | 'complete' | 'cancel' | 'note';
    by_user_id: string;
    note?: string;
    reason?: string;
  }>;

  @Prop() rejection_reason?: string;
  @Prop() notes?: string;
  @Prop() accepted_at?: Date;
  @Prop() rejected_at?: Date;
  @Prop() started_at?: Date;
  @Prop() completed_at?: Date;
  @Prop() cancelled_at?: Date;

  // Seeded marker (for cleanup)
  @Prop({ default: false }) seeded: boolean;
}
export const ProviderRequestSchema = SchemaFactory.createForClass(ProviderRequest);
ProviderRequestSchema.index({ provider_account_id: 1, status: 1, createdAt: -1 });
ProviderRequestSchema.index({ provider_account_id: 1, type: 1, createdAt: -1 });
ProviderRequestSchema.index({ provider_account_id: 1, scheduled_at: 1 });

// ===================== PROVIDER NOTIFICATIONS =====================
export enum ProviderNotificationType {
  NEW_REQUEST = 'new_request',
  REQUEST_STATUS = 'request_status',
  REQUEST_CANCELLED = 'request_cancelled',
  ADMIN_MESSAGE = 'admin_message',
  BOOKING_UPDATE = 'booking_update',
  KYC_UPDATE = 'kyc_update',
  BANK_UPDATE = 'bank_update',
  PAYOUT = 'payout',
}

@Schema({ timestamps: true, collection: 'provider_notifications' })
export class ProviderNotification extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true, enum: Object.values(ProviderNotificationType), index: true }) type: ProviderNotificationType;
  @Prop({ required: true }) title_ar: string;
  @Prop({ required: true }) title_en: string;
  @Prop() body_ar?: string;
  @Prop() body_en?: string;
  @Prop() icon?: string;
  @Prop() related_id?: string; // e.g. request_id
  @Prop() related_type?: string; // 'request' | 'kyc' | 'payout'
  @Prop({ default: false, index: true }) read: boolean;
  @Prop() read_at?: Date;
}
export const ProviderNotificationSchema = SchemaFactory.createForClass(ProviderNotification);
ProviderNotificationSchema.index({ provider_account_id: 1, read: 1, createdAt: -1 });

// ===================== PROVIDER AVAILABILITY =====================
export enum ProviderAvailabilityStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  ACCEPTING_ORDERS = 'accepting_orders',
}

@Schema({ timestamps: true, collection: 'provider_availability' })
export class ProviderAvailability extends Document {
  @Prop({ required: true, unique: true, index: true }) provider_account_id: string;
  @Prop({ required: true, default: ProviderAvailabilityStatus.OFFLINE, enum: Object.values(ProviderAvailabilityStatus) }) status: ProviderAvailabilityStatus;
  @Prop() last_online_at?: Date;
  @Prop() last_offline_at?: Date;
  @Prop() note?: string;
}
export const ProviderAvailabilitySchema = SchemaFactory.createForClass(ProviderAvailability);
