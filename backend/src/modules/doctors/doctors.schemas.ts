import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { buildSlug } from '../../common/slug.util';
@Schema({ timestamps: true, collection: 'doctors' })
export class Doctor extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ unique: true, sparse: true, index: true }) slug?: string;
  @Prop({ index: true }) provider_account_id?: string;
  @Prop({ required: true }) name_ar: string;
  @Prop() name_en?: string;
  @Prop({ required: true, index: true }) specialty: string;
  @Prop() specialty_ar?: string;
  @Prop({ default: 'male' }) gender: string;
  @Prop({ type: [String], default: ['ar'] }) languages: string[];
  @Prop({ default: '' }) photo_url: string;
  @Prop({ default: '' }) biography: string;
  @Prop({ default: 0 }) rating: number;
  @Prop({ default: 0 }) reviews_count: number;
  @Prop({ default: 50 }) consultation_fee: number;
  @Prop({ default: 0 }) home_visit_fee: number;
  @Prop({ default: 0 }) video_consultation_fee: number;
  @Prop({ default: false }) home_visit_enabled: boolean;
  @Prop({ default: false }) video_enabled: boolean;
  @Prop({ default: false }) voice_enabled: boolean;
  @Prop({ default: true }) clinic_enabled: boolean;
  @Prop({ type: [String], default: [] }) insurance_supported: string[];
  @Prop({ type: Object, default: {} }) clinic_location: { lat?: number; lng?: number; city?: string; address?: string; name?: string };
  @Prop({ type: [String], default: [] }) clinic_images: string[];
  @Prop({ type: [String], default: [] }) facilities_images: string[];
  @Prop({ type: [String], default: [] }) tags: string[];
  @Prop({ default: true }) is_accepting: boolean;
  @Prop({ default: true }) is_online: boolean;
  @Prop({ default: 30 }) default_slot_minutes: number;
  @Prop({ type: Object, default: {} }) weekly_schedule: Record<string, { start: string; end: string; breaks?: { start: string; end: string }[] }[]>;
  @Prop({ type: [String], default: [] }) blocked_dates: string[]; // YYYY-MM-DD
  @Prop({ default: 1 }) max_bookings_per_slot: number;
  @Prop({ default: false, index: true }) is_deleted: boolean;
  @Prop({ default: 'published', index: true }) status: string; // 'published' | 'draft' | 'archived'
}
export const DoctorSchema = SchemaFactory.createForClass(Doctor);
DoctorSchema.index({ specialty: 1, is_accepting: 1, is_online: 1 });

DoctorSchema.pre('save', function (next) {
  if (this.isModified('name_ar') || this.isModified('name_en') || !this.slug) {
    const name = this.name_ar || this.name_en || 'doctor';
    this.slug = buildSlug(name, this.id);
  }
  next();
});

export type AppointmentType = 'clinic' | 'home' | 'video' | 'voice';
export type AppointmentState = 'scheduled' | 'confirmed' | 'patient_arrived' | 'in_consultation' | 'completed' | 'cancelled' | 'no_show';

@Schema({ timestamps: true, collection: 'doctor_appointments' })
export class DoctorAppointment extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) doctor_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() patient_name?: string;
  @Prop() patient_phone?: string;
  @Prop({ required: true, default: 'clinic' }) type: AppointmentType;
  @Prop({ required: true }) scheduled_at: Date;
  @Prop({ default: 30 }) duration_minutes: number;
  @Prop({ required: true, default: 'scheduled', index: true }) state: AppointmentState;
  @Prop({ default: 0 }) fee: number;
  @Prop({ default: 'cash' }) payment_method: string;
  @Prop() insurance_provider?: string;
  @Prop({ default: 'none' }) insurance_status: string;
  @Prop({ type: [Object], default: [] }) documents: any[];
  @Prop() reason?: string;
  @Prop({ type: Object }) address?: any;
  @Prop({ type: [Object], default: [] }) state_history: any[];
}
export const DoctorAppointmentSchema = SchemaFactory.createForClass(DoctorAppointment);
DoctorAppointmentSchema.index({ doctor_id: 1, scheduled_at: 1 });
DoctorAppointmentSchema.index({ patient_id: 1, scheduled_at: -1 });

@Schema({ timestamps: true, collection: 'doctor_chat_messages' })
export class DoctorChatMessage extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) appointment_id: string;
  @Prop({ required: true }) sender_role: string;
  @Prop({ required: true }) sender_account_id: string;
  @Prop() text?: string;
  @Prop({ type: Object }) attachment?: any;
}
export const DoctorChatMessageSchema = SchemaFactory.createForClass(DoctorChatMessage);

@Schema({ timestamps: true, collection: 'consultation_notes' })
export class ConsultationNote extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) appointment_id: string;
  @Prop({ required: true }) doctor_id: string;
  @Prop({ required: true }) patient_id: string;
  @Prop() diagnosis?: string;
  @Prop() notes?: string;
  @Prop() follow_up_instructions?: string;
  @Prop({ type: [Object], default: [] }) prescriptions: Array<{ medicine: string; dose: string; duration: string; instructions?: string }>;
}
export const ConsultationNoteSchema = SchemaFactory.createForClass(ConsultationNote);

@Schema({ timestamps: true, collection: 'in_app_notifications' })
export class NotificationItem extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) recipient_account_id: string;
  @Prop({ required: true }) recipient_role: string;
  @Prop({ required: true }) type: string;
  @Prop({ required: true }) title: string;
  @Prop() body?: string;
  @Prop() entity_type?: string;
  @Prop() entity_id?: string;
  @Prop() deep_link?: string;
  @Prop({ default: false, index: true }) read: boolean;
}
export const NotificationItemSchema = SchemaFactory.createForClass(NotificationItem);
NotificationItemSchema.index({ recipient_account_id: 1, read: 1, createdAt: -1 });
