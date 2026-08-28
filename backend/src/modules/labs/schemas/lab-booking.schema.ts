import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LabBookingDocument = LabBooking & Document;

@Schema({ timestamps: true })
export class LabBooking {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', default: null, index: true })
  parent_appointment_id: Types.ObjectId; // Referring medical appointment ID

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  patient_id: Types.ObjectId;

  @Prop({ type: String })
  patient_name: string;
  
  @Prop({ type: Number })
  patient_age: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  lab_id: Types.ObjectId;

  @Prop({ required: true, enum: ['IN_LAB', 'HOME_COLLECTION'], default: 'IN_LAB' })
  delivery_mode: string;

  @Prop({ type: Object }) address?: { lat?: number; lng?: number; address?: string; city?: string; district?: string };

  @Prop({ required: true })
  test_code: string; // e.g., 'LAB-CBC'

  @Prop({ required: true })
  test_name_ar: string;

  @Prop({ required: true })
  test_name_en: string;

  @Prop({ type: String, default: null, index: true })
  sample_barcode_token: string; // Captured via Screen 3's Camera Scanner

  @Prop({
    type: String,
    enum: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'SAMPLE_COLLECTED', 'LAB_PROCESSING', 'REPORT_UPLOADED', 'CANCELLED'],
    default: 'PENDING_ACCEPTANCE',
    index: true
  })
  status: string;

  @Prop({
    type: [{
      parameter_name: String,
      numeric_value: Number,
      unit: String,
      is_abnormal: Boolean,
      flag_type: { type: String, enum: ['NORMAL', 'HIGH', 'LOW'], default: 'NORMAL' }
    }],
    default: []
  })
  entered_metric_results: any[]; // Tabulated on Screen 3

  @Prop({ type: String, default: null })
  signed_report_pdf_url: string; // Standard PDF signed report
  
  @Prop({ enum: ['cash', 'card', 'insurance'], default: 'cash' }) payment_method: string;
  @Prop({ default: 0 }) total_price: number;
}
export const LabBookingSchema = SchemaFactory.createForClass(LabBooking);
