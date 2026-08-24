import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MedicationDoseState, AppointmentMode, AppointmentStatus } from '../common/enums';
import { v4 as uuid } from 'uuid';

// =========== Medication Plan ===========
@Schema({ timestamps: true, collection: 'medication_plans' })
export class MedicationPlan {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() prescription_id?: string;
  @Prop() medicine_id?: string;
  @Prop({ required: true }) medicine_name_ar: string;
  @Prop() dose: string;
  @Prop() frequency_hours?: number;
  @Prop() times_per_day?: number;
  @Prop({ default: 7 }) duration_days: number;
  @Prop() instructions?: string;
  @Prop({ default: Date.now }) start_date: Date;
  @Prop() end_date?: Date;
  @Prop({ default: true }) active: boolean;
}
export type MedicationPlanDocument = MedicationPlan & Document;
export const MedicationPlanSchema = SchemaFactory.createForClass(MedicationPlan);

@Schema({ timestamps: true, collection: 'medication_doses' })
export class MedicationDose {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) plan_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) scheduled_at: Date;
  @Prop({ type: String, enum: Object.values(MedicationDoseState), default: MedicationDoseState.SCHEDULED, index: true })
  state: MedicationDoseState;
  @Prop() taken_at?: Date;
  @Prop() notified_at?: Date;
  @Prop() notes?: string;
}
export type MedicationDoseDocument = MedicationDose & Document;
export const MedicationDoseSchema = SchemaFactory.createForClass(MedicationDose);

// =========== Appointment ===========
@Schema({ timestamps: true, collection: 'appointments' })
export class Appointment {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() patient_name?: string;
  @Prop() patient_phone?: string;
  @Prop({ required: true, index: true }) doctor_id: string;
  @Prop() doctor_name?: string;
  @Prop({ type: String, enum: Object.values(AppointmentMode), default: AppointmentMode.CLINIC })
  mode: AppointmentMode;
  @Prop({ type: String, enum: Object.values(AppointmentStatus), default: AppointmentStatus.SCHEDULED, index: true })
  status: AppointmentStatus;
  @Prop() date: string; // YYYY-MM-DD
  @Prop() time: string; // HH:MM
  @Prop() price?: number;
  @Prop() chat_channel?: string;
  @Prop() video_channel?: string;
  @Prop() prescription_id?: string;
  @Prop() notes?: string;
}
export type AppointmentDocument = Appointment & Document;
export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// =========== Health Record / Vitals ===========
@Schema({ timestamps: true, collection: 'health_records' })
export class HealthRecord {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) record_type: string; // vitals|lab_result|radiology|allergy|note
  @Prop({ type: Object, default: {} }) data: Record<string, any>;
  @Prop() recorded_at: Date;
  @Prop() recorded_by?: string;
  @Prop() attachments?: string[];
}
export type HealthRecordDocument = HealthRecord & Document;
export const HealthRecordSchema = SchemaFactory.createForClass(HealthRecord);

// =========== AI Interaction Log ===========
@Schema({ timestamps: true, collection: 'ai_interactions' })
export class AIInteraction {
  @Prop({ default: () => uuid() }) id: string;
  @Prop() user_id?: string;
  @Prop({ required: true }) kind: string; // triage|voice_order|prescription_ocr|search
  @Prop() input?: string;
  @Prop({ type: Object }) output?: any;
  @Prop() model?: string;
  @Prop() latency_ms?: number;
  @Prop({ default: false }) flagged: boolean;
}
export type AIInteractionDocument = AIInteraction & Document;
export const AIInteractionSchema = SchemaFactory.createForClass(AIInteraction);
