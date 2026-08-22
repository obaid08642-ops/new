import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'outbound_referrals' })
export class OutboundReferral extends Document {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  referrer_doctor_id: string;

  @Prop({ required: true, index: true })
  patient_id: string;

  @Prop({ required: true })
  referral_code: string; // Outbound code generated for patients

  @Prop({ required: true, enum: ['lab', 'radiology'] })
  target_type: string;

  @Prop()
  notes?: string;

  @Prop({ default: [] })
  requested_tests: string[]; // List of tests/scans requested

  @Prop({ default: 'pending', enum: ['pending', 'completed', 'expired'] })
  status: string;
}
export type OutboundReferralDocument = OutboundReferral & Document;
export const OutboundReferralSchema = SchemaFactory.createForClass(OutboundReferral);
OutboundReferralSchema.index({ referral_code: 1 }, { unique: true });
