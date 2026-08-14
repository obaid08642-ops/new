import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RadiologyBookingDocument = RadiologyBooking & Document;

@Schema({ timestamps: true })
export class RadiologyBooking {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', default: null, index: true })
  parent_appointment_id: Types.ObjectId; // Referring medical appointment ID

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  patient_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  radiology_center_id: Types.ObjectId;

  @Prop({ required: true, enum: ['IN_CENTER', 'MOBILE_HOME_VISIT'], default: 'IN_CENTER' })
  delivery_mode: string;

  @Prop({ required: true })
  scan_type_code: string; // e.g., 'RAD-MRI-BRAIN'

  @Prop({ required: true })
  scan_name_ar: string;

  @Prop({ required: true })
  scan_name_en: string;

  @Prop({ type: String, default: null })
  allocated_machine_id: string; // Bound in Screen 2 to prevent hardware race conditions

  @Prop({
    type: String,
    enum: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'CHECKED_IN', 'SCANNING_COMPLETED', 'REPORT_UPLOADED', 'CANCELLED'],
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
}
export const RadiologyBookingSchema = SchemaFactory.createForClass(RadiologyBooking);
