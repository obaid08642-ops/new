import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'pharmacy_drug_rejection_logs' })
export class DrugRejectionLog {
  @Prop({ default: () => uuid() }) id: string;
  
  @Prop({ required: true, index: true }) medicine_id: string;
  @Prop({ required: true, index: true }) order_id: string;
  @Prop({ required: true, index: true }) pharmacy_id: string;
  
  @Prop({ required: true, enum: ['reject', 'accept'], index: true })
  type: 'reject' | 'accept';
  
  @Prop({ default: Date.now }) timestamp: Date;
}

export type DrugRejectionLogDocument = DrugRejectionLog & Document;
export const DrugRejectionLogSchema = SchemaFactory.createForClass(DrugRejectionLog);

DrugRejectionLogSchema.index({ medicine_id: 1, type: 1, timestamp: -1 });
