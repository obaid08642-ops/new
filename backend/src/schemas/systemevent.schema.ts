import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SystemEvent extends Document {
  @Prop({ required: true })
  eventType: string; // e.g., 'patient_registered', 'appointment_booked'

  @Prop({ required: true, index: true })
  type: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, any>;

  @Prop({ required: true, default: 'SYSTEM' })
  source: string;

  @Prop({ default: 'pending' })
  status: string; // 'pending', 'processed', 'failed'

  @Prop()
  entity_type: string;

  @Prop()
  entity_id: string;

  @Prop()
  actor_account_id: string;
}

export const SystemEventSchema = SchemaFactory.createForClass(SystemEvent);
