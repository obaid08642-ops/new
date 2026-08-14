import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class VitalReading extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, index: true }) type: string; // bp | glucose | heart_rate | weight | temperature | spo2
  @Prop({ required: true }) value: string; // '120/80' for bp, '95' for glucose
  @Prop() value_secondary?: number; // diastolic for bp
  @Prop() unit: string;
  @Prop({ default: () => new Date() }) measured_at: Date;
  @Prop() context?: string; // before_meal | after_meal | morning | bedtime
  @Prop() notes?: string;
  @Prop({ default: 'manual' }) source: string; // manual | device | doctor
}
export const VitalReadingSchema = SchemaFactory.createForClass(VitalReading);
VitalReadingSchema.index({ patient_id: 1, type: 1, measured_at: -1 });

@Schema({ timestamps: true })
export class MedicationReminder extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) medicine_name_ar: string;
  @Prop() medicine_name_en?: string;
  @Prop() medicine_id?: string;
  @Prop() order_id?: string;
  @Prop() prescription_id?: string;
  @Prop({ required: true }) dose: string; // '1 قرص'
  @Prop({ default: 1 }) dosage_count: number;
  @Prop({ default: 'tablet' }) dosage_form: string; // tablet | ml | drop | spray | capsule
  @Prop({ default: [] }) times: string[]; // ['08:00','14:00','20:00'] 24h
  @Prop({ default: 'daily' }) frequency: string; // daily | weekly | as_needed
  @Prop({ default: () => new Date() }) start_date: Date;
  @Prop() end_date?: Date;
  @Prop({ default: 0 }) duration_days: number; // 0 = ongoing
  @Prop() instructions_ar?: string;
  @Prop({ default: 'manual' }) source: string; // manual | dispense | doctor
  @Prop({ default: true }) active: boolean;
  @Prop({ default: [] }) log: any[]; // [{at, status: taken|skipped|missed, time_key}]
  @Prop({ default: false }) chronic: boolean; // monthly-refill chronic medication
  @Prop({ default: 0 }) pills_remaining: number;
  @Prop() refill_date?: Date;
}
export const MedicationReminderSchema = SchemaFactory.createForClass(MedicationReminder);
MedicationReminderSchema.index({ patient_id: 1, active: 1 });

@Schema({ timestamps: true })
export class SleepReading extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) sleep_score: number; // 0-100
  @Prop({ required: true }) duration_hours: number;
  @Prop({ default: () => new Date() }) measured_at: Date;
  @Prop({ default: 'device' }) source: string;
}
export const SleepReadingSchema = SchemaFactory.createForClass(SleepReading);
SleepReadingSchema.index({ patient_id: 1, measured_at: -1 });
