import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'return_requests' })
export class ReturnRequest {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) order_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, index: true }) pharmacy_id: string;
  @Prop({ required: true }) reason: string;
  @Prop() photo_url?: string;
  @Prop({ type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' })
  status: string;
  @Prop() rejection_reason?: string;
}

export type ReturnRequestDocument = ReturnRequest & Document;
export const ReturnRequestSchema = SchemaFactory.createForClass(ReturnRequest);
