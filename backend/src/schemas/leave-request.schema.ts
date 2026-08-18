import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class LeaveRequest {
  @Prop({ default: () => uuidv4(), unique: true, index: true }) id: string;
  @Prop({ required: true, index: true }) facility_id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop() provider_name?: string;
  @Prop() provider_type?: string;
  @Prop({ required: true, enum: ['vacation', 'emergency', 'sick', 'other'], default: 'vacation' }) type: string;
  @Prop({ required: true }) start_date: Date;
  @Prop({ required: true }) end_date: Date;
  @Prop() reason?: string;
  @Prop({ default: 'pending', index: true, enum: ['pending', 'approved', 'rejected'] }) status: string;
  @Prop() decided_by?: string;
  @Prop() decided_at?: Date;
  @Prop() decision_note?: string;
}
export type LeaveRequestDocument = LeaveRequest & Document;
export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);
