import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class ReturnRequest extends Document {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, index: true }) order_id: string;
  @Prop({ required: true, index: true }) service_type: string; // pharmacy | consultation | diagnostics | nursing | insurance
  @Prop({ required: true }) reason: string;
  @Prop() details?: string;
  @Prop({ default: 'wallet' }) refund_method: string; // wallet | card | bank
  @Prop({ type: Number, default: 0 }) amount: number;
  @Prop({ type: [String], default: [] }) attached_docs: string[];
  @Prop({ enum: ['processing', 'approved', 'completed', 'rejected'], default: 'processing', index: true }) status: string;
  @Prop() resolved_by?: string;
  @Prop() resolved_at?: Date;
  @Prop() admin_note?: string;
}

export const ReturnRequestSchema = SchemaFactory.createForClass(ReturnRequest);
