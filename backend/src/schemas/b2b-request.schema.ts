import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'b2b_requests' })
export class B2BRequest {
  @Prop({ default: () => uuid(), unique: true }) id: string;
  @Prop({ required: true, index: true }) pharmacy: string;
  @Prop({ required: true }) total_items: number;
  @Prop({ required: true, default: 'manual' }) input_method: 'voice' | 'ocr' | 'manual';
  @Prop({ default: 'pending', index: true }) status: 'pending' | 'approved' | 'rejected';
  @Prop({ default: '' }) notes: string;
  @Prop({ type: Array, default: [] }) items: Array<{ name: string; qty: number; unit: string }>;
  @Prop({ default: () => new Date() }) submitted: Date;
}

export type B2BRequestDocument = B2BRequest & Document;
export const B2BRequestSchema = SchemaFactory.createForClass(B2BRequest);
