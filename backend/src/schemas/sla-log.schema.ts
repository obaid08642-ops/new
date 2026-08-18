import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type SlaLogDocument = SlaLog & Document;

@Schema({ timestamps: true, collection: 'sla_logs' })
export class SlaLog {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  providerId: string;

  @Prop({ required: true, index: true })
  orderId: string;

  @Prop({ required: true })
  durationSeconds: number;

  @Prop({ required: true })
  slaLimit: number;

  @Prop({ required: true, default: false, index: true })
  isBreached: boolean;
}

export const SlaLogSchema = SchemaFactory.createForClass(SlaLog);
