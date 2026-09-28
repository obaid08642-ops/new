import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class ReturnRequest extends Document {
  // Written by the services but previously undeclared: strict mode silently dropped these (tools/audit/schemadrift.js).
  @Prop({ type: [Object], default: [] }) items?: Record<string, any>[];
  @Prop({ default: false }) is_opened?: boolean;
  @Prop({ default: false }) is_used?: boolean;
  @Prop({ default: () => uuidv4(), unique: true }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, index: true }) order_id: string;
  @Prop({ index: true }) booking_kind?: string;
  @Prop({ required: true, index: true }) service_type: string; // pharmacy | consultation | diagnostics | nursing | insurance
  @Prop({ required: true }) reason: string;
  @Prop() details?: string;
  @Prop({ default: 'original' }) refund_method: string;
  @Prop({ type: Number, default: 0 }) amount: number;
  @Prop({ type: [String], default: [] }) attached_docs: string[];
  @Prop({ enum: ['processing', 'approved', 'completed', 'rejected'], default: 'processing', index: true }) status: string;
  @Prop() resolved_by?: string;
  @Prop() resolved_at?: Date;
  @Prop() admin_note?: string;
}

export const ReturnRequestSchema = SchemaFactory.createForClass(ReturnRequest);
