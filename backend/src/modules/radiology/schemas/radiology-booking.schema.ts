import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RadiologyBookingDocument = RadiologyBooking & Document;

@Schema({ timestamps: true })
export class RadiologyBooking {
  /** Public UUID used by apps/providers to reference the booking (mongo _id stays internal). */
  @Prop({ type: String, unique: true, index: true })
  id: string;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', default: null, index: true })
  parent_appointment_id: Types.ObjectId; // Referring medical appointment ID

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  patient_id: Types.ObjectId;

  /** Bound when a center accepts the booking (null while pending acceptance). */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  radiology_center_id: Types.ObjectId;

  @Prop({ required: true, enum: ['IN_CENTER', 'MOBILE_HOME_VISIT'], default: 'IN_CENTER' })
  delivery_mode: string;

  @Prop() referring_doctor_id?: string;
  @Prop({ required: true })
  scan_type_code: string; // e.g., 'RAD-MRI-BRAIN'

  @Prop({ required: true })
  scan_name_ar: string;

  @Prop({ required: true })
  scan_name_en: string;

  // Patient booking snapshot. These values are derived server-side from the
  // reviewed catalog rather than accepted as client-controlled price/name data.
  @Prop({ type: String, index: true }) service_id?: string;
  @Prop() scheduled_at?: Date;
  @Prop() facility_id?: string;
  @Prop({ type: Object }) address?: { lat?: number; lng?: number; address?: string; city?: string; district?: string };
  @Prop({ default: 0 }) price?: number;
  @Prop({ default: 0 }) total?: number;
  @Prop({ enum: ['cash', 'card', 'insurance'], default: 'cash' }) payment_method?: string;
  @Prop({ type: Object }) referral?: any;

  @Prop({ type: String, default: null })
  allocated_machine_id: string; // Bound in Screen 2 to prevent hardware race conditions

  @Prop({
    type: String,
    // Center vocabulary + full ops vocabulary (RadiologyBookingState) — the two
    // radiology booking systems share this collection, so both must be writable.
    enum: [
      'PENDING_ACCEPTANCE', 'ACCEPTED', 'CHECKED_IN', 'SCANNING_COMPLETED', 'REPORT_UPLOADED', 'CANCELLED',
      'NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY', 'CONFIRMED', 'ARRIVED_CHECKIN',
      'IN_SCANNING', 'REPORT_DRAFT', 'UNDER_REVIEW', 'REPORT_READY', 'SCAN_ABORTED',
    ],
    default: 'PENDING_ACCEPTANCE',
    index: true
  })
  status: string;

  @Prop({ type: String, default: null })
  clinical_impression_report: string; // Written on Screen 3

  @Prop({ type: [String], default: [] })
  scanned_files_s3_urls: string[]; // Uploaded DICOM or ZIP file paths

  @Prop({ type: String, default: null })
  signed_report_pdf_url: string; // Standard PDF signed report

  @Prop({ type: String, default: null })
  report_storage_object_id: string;

  @Prop({ type: [String], default: [] })
  scan_storage_object_ids: string[];
}
export const RadiologyBookingSchema = SchemaFactory.createForClass(RadiologyBooking);
