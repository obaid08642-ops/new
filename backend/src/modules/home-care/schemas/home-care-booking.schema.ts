import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PaymentMethod { CASH = 'cash', INSURANCE = 'insurance' }
export enum TransportType { PATIENT_PROVIDED = 'patient', NURSE_PROVIDED = 'nurse' }
export enum BookingStatus { 
  PENDING_INSURANCE = 'pending_insurance',
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

@Schema({ timestamps: true })
export class HomeCareBooking extends Document {
  @Prop({ required: true }) patient_id: string;
  @Prop({ required: true }) nurse_id: string;
  @Prop({ required: true }) service_id: string;
  
  // Scheduling
  @Prop({ type: [String], required: true }) selected_dates: string[]; // تواريخ متعددة
  @Prop({ required: true }) selected_time: string; // الساعة (مثال: 14:30)
  @Prop({ required: true }) frequency: string; // التكرار
  
  // Transport & Location
  @Prop({ required: true, enum: TransportType }) transport_type: string;
  @Prop({ type: Object }) patient_location: { address: string, lat: number, lng: number };
  
  // Financials & Status
  @Prop({ required: true, enum: PaymentMethod }) payment_method: string;
  @Prop({ required: true, enum: BookingStatus }) status: string;
  @Prop() total_amount: number;
  @Prop() transport_fee: number;
  @Prop({ type: Object }) insurance_details: { provider: string, policy_number: string, coverage_status: string };
}
export const HomeCareBookingSchema = SchemaFactory.createForClass(HomeCareBooking);
