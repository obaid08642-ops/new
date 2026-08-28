import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class RefundRequest {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;
  @Prop({ required: true }) booking_kind: string;
  @Prop({ required: true, index: true }) booking_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) reason: string;
  @Prop({ type: Number }) amount?: number;
  @Prop({ enum: ['requested', 'approved', 'rejected', 'completed'], default: 'requested', index: true }) status: string;
  @Prop() resolved_by?: string;
  @Prop() resolved_at?: Date;
  @Prop() admin_note?: string;
}
export const RefundRequestSchema = SchemaFactory.createForClass(RefundRequest);
