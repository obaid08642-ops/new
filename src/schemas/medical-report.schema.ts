import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { trackingId, TRACK_PREFIX } from '../common/tracking';

/**
 * MedicalReport — a doctor / facility issued medical report (NOT a lab/radiology result).
 * Examples: discharge summary, clinic visit note, surgery report, second opinion, certificate.
 * Links to: consultation/appointment, lab/radiology bookings, prescription — all optional.
 */
export enum MedicalReportType {
  CLINIC_NOTE = 'clinic_note',
  DISCHARGE_SUMMARY = 'discharge_summary',
  SURGERY_REPORT = 'surgery_report',
  CONSULTATION_NOTE = 'consultation_note',
  SECOND_OPINION = 'second_opinion',
  MEDICAL_CERTIFICATE = 'medical_certificate',
  REFERRAL = 'referral',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class MedicalReport extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ unique: true, default: () => trackingId(TRACK_PREFIX.medical_report) }) tracking_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() patient_name?: string;
  @Prop({ required: true }) title_ar: string;
  @Prop() title_en?: string;
  @Prop({ required: true, enum: Object.values(MedicalReportType), default: MedicalReportType.CLINIC_NOTE }) report_type: MedicalReportType;
  @Prop() summary?: string;        // short summary visible in list
  @Prop() body?: string;           // full doctor's notes (markdown / plain text)
  @Prop() diagnosis?: string;
  @Prop() recommendations?: string;
  @Prop({ default: false }) critical: boolean;

  // Linked entities (any/all optional)
  @Prop({ index: true }) appointment_id?: string;
  @Prop({ index: true }) prescription_id?: string;
  @Prop({ index: true }) lab_booking_id?: string;
  @Prop({ index: true }) radiology_booking_id?: string;
  @Prop() doctor_id?: string;
  @Prop() doctor_name?: string;
  @Prop() facility_id?: string;
  @Prop() facility_name?: string;

  // Attachments (PDFs/images) — base64 like prescriptions / lab results
  @Prop({ default: [] }) attachments: any[]; // [{name, mime, base64}]

  @Prop() issued_at?: Date;
  @Prop({ default: false }) viewed_by_patient: boolean;
  @Prop() patient_viewed_at?: Date;
}
export const MedicalReportSchema = SchemaFactory.createForClass(MedicalReport);
MedicalReportSchema.index({ patient_id: 1, createdAt: -1 });
MedicalReportSchema.index({ report_type: 1, patient_id: 1 });
