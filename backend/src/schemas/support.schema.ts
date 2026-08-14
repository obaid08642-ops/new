import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { trackingId, TRACK_PREFIX } from '../common/tracking';

export enum SupportStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}
export enum SupportCategory {
  GENERAL = 'GENERAL',
  ORDER_ISSUE = 'ORDER_ISSUE',
  PAYMENT = 'PAYMENT',
  TECHNICAL = 'TECHNICAL',
  COMPLAINT = 'COMPLAINT',
  SUGGESTION = 'SUGGESTION',
}

@Schema({ timestamps: true })
export class SupportRequest extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ unique: true, default: () => trackingId(TRACK_PREFIX.support) }) tracking_id: string;
  @Prop({ required: true, index: true }) user_id: string;
  @Prop() user_name?: string;
  @Prop() user_phone?: string;
  @Prop({ required: true, enum: Object.values(SupportCategory) }) category: SupportCategory;
  @Prop({ required: true }) subject: string;
  @Prop({ required: true }) message: string;
  @Prop({ default: [] }) attachments: any[]; // [{name,url_base64,type}]
  @Prop({ default: SupportStatus.OPEN, enum: Object.values(SupportStatus) }) status: SupportStatus;
  @Prop({ default: 'patient' }) source_role: string;
  @Prop({ default: 'medium' }) priority: string;
  @Prop({ default: [] }) thread: any[]; // [{by, role, message, at}]
  @Prop() resolved_at?: Date;
  @Prop() assigned_to?: string;
}
export const SupportRequestSchema = SchemaFactory.createForClass(SupportRequest);
SupportRequestSchema.index({ user_id: 1, createdAt: -1 });
SupportRequestSchema.index({ status: 1, createdAt: -1 });

@Schema({ timestamps: true })
export class PatientSettings extends Document {
  @Prop({ required: true, unique: true }) user_id: string;
  @Prop({ default: 'ar' }) language: string;
  @Prop({ default: 'light' }) theme: string; // light | dark | system
  @Prop({ default: 'gregorian' }) calendar: string; // gregorian | hijri
  @Prop({ default: true }) notifications_enabled: boolean;
  @Prop({ default: true }) notif_reminders: boolean;
  @Prop({ default: true }) notif_orders: boolean;
  @Prop({ default: true }) notif_appointments: boolean;
  @Prop({ default: true }) notif_lab_results: boolean;
  @Prop() expo_push_token?: string;
}
export const PatientSettingsSchema = SchemaFactory.createForClass(PatientSettings);
