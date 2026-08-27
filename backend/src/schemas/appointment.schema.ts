import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { InsuranceDetails, InsuranceDetailsSchema } from './insurance.schema';

/**
 * Appointment state machine
 *   PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED
 *           ↘ CANCELLED   ↘ NO_SHOW
 *           ↘ RESCHEDULED → CONFIRMED
 *
 * NOTE: We keep this enum as plain strings (not importing from common/enums.ts)
 * because the existing AppointmentStatus enum there is a different, simpler model
 * (scheduled/in_progress/completed/cancelled/no_show). We use the richer one here
 * to follow the spec exactly without breaking existing imports.
 */
export const APPT_STATES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  RESCHEDULED: 'RESCHEDULED',
  CHECKED_IN: 'CHECKED_IN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type ApptState = typeof APPT_STATES[keyof typeof APPT_STATES];

export const APPT_TRANSITIONS: Record<ApptState, ApptState[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'RESCHEDULED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'],
  RESCHEDULED: ['CONFIRMED', 'CANCELLED'],
  CHECKED_IN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export type ServiceType = 'clinic' | 'video' | 'home';

@Schema({ _id: false })
class StateLogEntry {
  @Prop({ required: true }) state: string;
  @Prop({ default: Date.now }) at: Date;
  @Prop() by_user_id?: string;
  @Prop() by_role?: string;
  @Prop() note?: string;
}
const StateLogSchema = SchemaFactory.createForClass(StateLogEntry);

@Schema({ timestamps: true, collection: 'appointments' })
export class Appointment {
  @Prop({ default: () => uuid() }) id: string;

  // Parties
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, index: true }) doctor_id: string; // provider_profile.id (NOT user_id)
  @Prop({ required: true }) doctor_user_id: string;

  // Service
  @Prop({ type: String, enum: ['clinic', 'video', 'home'], required: true })
  service_type: ServiceType;

  // Slot
  @Prop({ required: true }) slot_start: Date; // ISO datetime
  @Prop({ required: true }) slot_end: Date;
  @Prop({ default: 30 }) duration_minutes: number;

  // State machine
  @Prop({ type: String, enum: Object.values(APPT_STATES), default: APPT_STATES.PENDING, index: true })
  status: ApptState;
  @Prop({ type: [StateLogSchema], default: [] }) state_history: StateLogEntry[];

  // Financials
  @Prop({ required: true }) price: number;
  @Prop({ default: 0 }) service_fee: number;
  @Prop({ default: 0 }) home_visit_fee: number;
  @Prop({ default: 0 }) transportation_fee: number;
  @Prop({ default: 0 }) total_price: number;
  @Prop({ default: 'pending' }) payment_status: 'pending' | 'paid' | 'refunded';
  @Prop({ enum: ['cash', 'card', 'insurance'], default: 'card' }) payment_method?: string;
  @Prop() insurance_provider?: string;
  @Prop() insurance_member_id?: string;
  @Prop({ type: InsuranceDetailsSchema }) insurance_details?: InsuranceDetails;

  // Patient inputs
  @Prop() patient_notes?: string;
  /** Set when a family member booked this appointment on behalf of the patient */
  @Prop() booked_by_user_id?: string;
  @Prop({ default: [] }) symptoms: string[];
  @Prop({
    type: { lat: Number, lng: Number, address: String },
    _id: false,
  })
  visit_location?: { lat: number; lng: number; address: string }; // for home visits

  // Doctor-written consultation summary (SOAP) — the ONLY source for patient summary screen
  @Prop({
    type: {
      diagnosis: String,
      notes: String,
      recommendations: String,
      prescription: [{ name: String, dose: String, duration: String }],
      follow_up_recommended: Boolean,
      follow_up_window_days: Number,
      written_at: Date,
    },
    _id: false,
  })
  summary?: {
    diagnosis?: string; notes?: string; recommendations?: string;
    prescription?: { name?: string; dose?: string; duration?: string }[];
    follow_up_recommended?: boolean; follow_up_window_days?: number; written_at?: Date;
  };

  // Outputs (filled later)
  @Prop({ type: [String], default: [] }) prescriptions?: string[];
  @Prop({ type: [String], default: [] }) labRequests?: string[];
  @Prop({ type: [String], default: [] }) radiologyRequests?: string[];
  @Prop({ type: [{ days: Number, reason: String }], default: [] }) sickLeaves?: { days: number; reason: string }[];
  @Prop() consultation_id?: string;
  @Prop() cancellation_reason?: string;
  @Prop() rescheduled_from_id?: string;
  @Prop() confirmed_at?: Date;
  @Prop() completed_at?: Date;
}
export type AppointmentDocument = Appointment & Document;
export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
// Prevent double-booking at the SAME slot for the SAME doctor
AppointmentSchema.index(
  { doctor_id: 1, slot_start: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] } } },
);
// M6/ER-10: hot read path — "my appointments, newest first"
AppointmentSchema.index({ patient_id: 1, slot_start: -1 });
AppointmentSchema.index({ doctor_id: 1, status: 1, slot_start: -1 });
