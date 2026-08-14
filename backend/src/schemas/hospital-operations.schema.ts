import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

// ─── HOSPITAL BED MANAGEMENT ───────────────────────────────────────────────

@Schema({ timestamps: true, collection: 'facility_wards' })
export class Ward {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) facility_id: string;
  @Prop({ required: true }) name: string;
  @Prop({ default: 0 }) total_beds: number;
  @Prop({ default: 0 }) available_beds: number;
}
export type WardDocument = Ward & Document;
export const WardSchema = SchemaFactory.createForClass(Ward);

@Schema({ timestamps: true, collection: 'facility_beds' })
export class Bed {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) ward_id: string;
  @Prop({ required: true }) bed_number: string;
  @Prop({ type: String, enum: ['general', 'icu', 'ccu'], default: 'general' }) type: 'general' | 'icu' | 'ccu';
  @Prop({ type: String, enum: ['available', 'occupied', 'reserved'], default: 'available' }) status: 'available' | 'occupied' | 'reserved';
  @Prop() occupied_by_patient_id?: string;
}
export type BedDocument = Bed & Document;
export const BedSchema = SchemaFactory.createForClass(Bed);

@Schema({ timestamps: true, collection: 'facility_admissions' })
export class Admission {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, index: true }) facility_id: string;
  @Prop({ required: true, index: true }) bed_id: string;
  @Prop({ default: () => new Date() }) admitted_at: Date;
  @Prop() discharged_at?: Date;
  @Prop({ type: String, enum: ['active', 'discharged'], default: 'active' }) status: 'active' | 'discharged';
}
export type AdmissionDocument = Admission & Document;
export const AdmissionSchema = SchemaFactory.createForClass(Admission);

// ─── STAFF SHIFTS & ATTENDANCE ─────────────────────────────────────────────

@Schema({ timestamps: true, collection: 'staff_shifts' })
export class Shift {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) user_id: string; // Doctor/Nurse/Staff ID
  @Prop({ required: true, index: true }) facility_id: string;
  @Prop() department_id?: string;
  @Prop({ required: true }) start_time: string; // e.g. "08:00"
  @Prop({ required: true }) end_time: string;   // e.g. "14:00"
  @Prop({ required: true }) day_of_week: string; // e.g. "Sunday"
  @Prop({ type: String, enum: ['scheduled', 'substitute', 'cancelled'], default: 'scheduled' }) status: 'scheduled' | 'substitute' | 'cancelled';
}
export type ShiftDocument = Shift & Document;
export const ShiftSchema = SchemaFactory.createForClass(Shift);

@Schema({ timestamps: true, collection: 'staff_attendance' })
export class Attendance {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) user_id: string;
  @Prop({ required: true, index: true }) facility_id: string;
  @Prop({ required: true }) check_in_time: Date;
  @Prop() check_out_time?: Date;
  @Prop() location_lat?: number;
  @Prop() location_lng?: number;
  @Prop({ type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'present' }) status: 'present' | 'absent' | 'late' | 'excused';
}
export type AttendanceDocument = Attendance & Document;
export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// ─── SURGERY ROOM BOOKING ──────────────────────────────────────────────────

@Schema({ timestamps: true, collection: 'surgery_bookings' })
export class SurgeryBooking {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) facility_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, index: true }) primary_surgeon_id: string;
  @Prop({ type: [String], default: [] }) assistants: string[];
  @Prop({ required: true }) ot_room_number: string;
  @Prop({ required: true }) scheduled_at: Date;
  @Prop({ required: true }) duration_mins: number;
  @Prop({ type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' }) status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}
export type SurgeryBookingDocument = SurgeryBooking & Document;
export const SurgeryBookingSchema = SchemaFactory.createForClass(SurgeryBooking);
